"""Placement rules for moving tasks (data-model "Placement rules", research R5)."""

import pytest
from sqlalchemy import select

from app.models.audit import AuditEntry
from app.models.project import Project
from app.models.task import Task
from app.services import tasks as task_service


async def project_id(db) -> int:
    return (await db.execute(select(Project.id).where(Project.name == "Billing Revamp"))).scalar_one()


async def column_ids(db, pid: int, column: str) -> list[int]:
    rows = await db.execute(
        select(Task.id).where(Task.project_id == pid, Task.column == column).order_by(Task.position)
    )
    return list(rows.scalars())


async def positions(db, pid: int, column: str) -> list[int]:
    rows = await db.execute(
        select(Task.position).where(Task.project_id == pid, Task.column == column).order_by(Task.position)
    )
    return list(rows.scalars())


async def assert_gapless(db, pid: int):
    for column in ("todo", "in_progress", "in_review", "done"):
        found = await positions(db, pid, column)
        assert found == list(range(len(found))), (column, found)


async def test_move_inserts_at_index_in_another_column(db):
    pid = await project_id(db)
    todo = await column_ids(db, pid, "todo")
    review = await column_ids(db, pid, "in_review")
    moved = await task_service.move_task(db, todo[0], "in_review", 1, actor_id=2)
    assert moved.column == "in_review" and moved.position == 1
    assert (await column_ids(db, pid, "in_review")) == [review[0], todo[0], *review[1:]]
    assert (await column_ids(db, pid, "todo")) == todo[1:]
    await assert_gapless(db, pid)


async def test_index_is_clamped_to_zero_and_count(db):
    pid = await project_id(db)
    todo = await column_ids(db, pid, "todo")
    done = await column_ids(db, pid, "done")
    moved = await task_service.move_task(db, todo[0], "done", 999, actor_id=2)
    assert moved.position == len(done)  # past the end means the bottom
    assert (await column_ids(db, pid, "done"))[-1] == todo[0]
    await assert_gapless(db, pid)


async def test_no_position_appends_to_the_bottom(db):
    pid = await project_id(db)
    todo = await column_ids(db, pid, "todo")
    done = await column_ids(db, pid, "done")
    moved = await task_service.move_task(db, todo[0], "done", None, actor_id=2)
    assert moved.position == len(done)


async def test_reordering_within_the_same_column(db):
    pid = await project_id(db)
    done = await column_ids(db, pid, "done")
    moved = await task_service.move_task(db, done[0], "done", 2, actor_id=2)
    assert moved.position == 2
    assert (await column_ids(db, pid, "done")) == [done[1], done[2], done[0]]
    await assert_gapless(db, pid)


async def test_same_column_and_same_index_changes_nothing_and_writes_no_audit(db):
    pid = await project_id(db)
    done = await column_ids(db, pid, "done")
    before = (await db.get(Task, done[1])).updated_at
    moved = await task_service.move_task(db, done[1], "done", 1, actor_id=2)
    assert moved.position == 1 and moved.updated_at == before
    audits = (await db.execute(select(AuditEntry).where(AuditEntry.action == "task.moved"))).scalars().all()
    assert audits == []
    assert (await column_ids(db, pid, "done")) == done


async def test_updated_at_changes_on_move_and_audit_records_old_and_new(db):
    pid = await project_id(db)
    todo = await column_ids(db, pid, "todo")
    before = (await db.get(Task, todo[0])).updated_at
    moved = await task_service.move_task(db, todo[0], "in_progress", 0, actor_id=2)
    assert moved.updated_at > before
    audit = (await db.execute(select(AuditEntry).where(AuditEntry.action == "task.moved"))).scalar_one()
    assert audit.actor_id == 2 and audit.entity_type == "task" and audit.entity_id == todo[0]
    assert '"column": ["todo", "in_progress"]' in audit.changes


async def test_unknown_task_raises_not_found(db):
    from app.core.errors import NotFound

    with pytest.raises(NotFound):
        await task_service.move_task(db, 99999, "done", None, actor_id=2)
