"""Tasks domain: owns the `tasks` table (FR-009 to FR-016).

Positions are gapless 0..n-1 within each `(project, column)`. Every mutating function is one unit of
work: it takes the write lock, changes data, writes the audit entry, queues events and commits.
Other domains reach tasks only through these functions.
"""

from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import utcnow
from app.core.errors import FieldProblem, NotFound
from app.core.state import get_state
from app.models.audit import AuditAction
from app.models.notification import NotificationType
from app.models.task import COLUMN_ORDER, Column, Task
from app.schemas.task import TaskOut, TaskRef
from app.schemas.user import UserOut
from app.services import audit, comments, events, notifications, projects, users


async def get_task(session: AsyncSession, task_id: int) -> Task:
    """Return a task or raise `NotFound` (ids below 1 never exist)."""
    task = await session.get(Task, task_id) if task_id > 0 else None
    if task is None:
        raise NotFound()
    return task


async def get_task_ref(session: AsyncSession, task_id: int) -> TaskRef:
    """Return the facts other domains need about a task, or raise `NotFound`."""
    task = await get_task(session, task_id)
    return TaskRef(id=task.id, project_id=task.project_id, title=task.title, assignee_id=task.assignee_id)


async def list_board(session: AsyncSession, project_id: int) -> dict[Column, list[Task]]:
    """Return the project's tasks grouped by column, each ordered by position."""
    rows = await session.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.position, Task.id)
    )
    board: dict[Column, list[Task]] = {column: [] for column in COLUMN_ORDER}
    for task in rows.scalars():
        board[Column(task.column)].append(task)
    return board


async def column_counts(
    session: AsyncSession, project_ids: Iterable[int], user_id: int
) -> dict[int, tuple[dict[str, int], int]]:
    """Return, per project, the task count per column and how many tasks are assigned to `user_id`."""
    ids = list(project_ids)
    result: dict[int, tuple[dict[str, int], int]] = {
        pid: ({column.value: 0 for column in COLUMN_ORDER}, 0) for pid in ids
    }
    if not ids:
        return result
    rows = await session.execute(
        select(Task.project_id, Task.column, func.count())
        .where(Task.project_id.in_(ids))
        .group_by(Task.project_id, Task.column)
    )
    for project_id, column, count in rows.all():
        result[project_id][0][column] = count
    mine = await session.execute(
        select(Task.project_id, func.count())
        .where(Task.project_id.in_(ids), Task.assignee_id == user_id)
        .group_by(Task.project_id)
    )
    for project_id, count in mine.all():
        counts, _ = result[project_id]
        result[project_id] = (counts, count)
    return result


async def to_out(session: AsyncSession, tasks: Iterable[Task]) -> dict[int, TaskOut]:
    """Build `TaskOut` objects (assignee and comment count included), keyed by task id."""
    items = list(tasks)
    assignees = await users.get_users_by_ids(session, [t.assignee_id for t in items if t.assignee_id])
    counts = await comments.count_by_task(session, [t.id for t in items])
    return {
        t.id: TaskOut(
            id=t.id,
            project_id=t.project_id,
            title=t.title,
            description=t.description,
            column=Column(t.column),
            position=t.position,
            assignee=UserOut.model_validate(assignees[t.assignee_id]) if t.assignee_id else None,
            created_at=t.created_at,
            updated_at=t.updated_at,
            comment_count=counts.get(t.id, 0),
        )
        for t in items
    }


async def _column_tasks(
    session: AsyncSession, project_id: int, column: Column, *, exclude_id: int | None = None
) -> list[Task]:
    """Return a column's tasks ordered by position, optionally leaving one task out."""
    query = select(Task).where(Task.project_id == project_id, Task.column == column.value)
    if exclude_id is not None:
        query = query.where(Task.id != exclude_id)
    rows = await session.execute(query.order_by(Task.position, Task.id))
    return list(rows.scalars())


def _renumber(tasks: list[Task]) -> None:
    """Make positions gapless 0..n-1 in list order (only changed values are written)."""
    for index, task in enumerate(tasks):
        if task.position != index:
            task.position = index


async def move_task(
    session: AsyncSession, task_id: int, column: str, position: int | None, *, actor_id: int
) -> Task:
    """Move a task to `column` at index `position` (None = bottom) and renumber both columns.

    Dropping a task where it already is changes nothing and writes no audit entry or event
    (spec edge case). Any user may move any task in either direction (FR-013).
    """
    target_column = Column(column)
    async with get_state().write_lock:
        task = await get_task(session, task_id)
        source_column = Column(task.column)
        old_position = task.position
        source = await _column_tasks(session, task.project_id, source_column, exclude_id=task.id)
        target = (
            source
            if target_column == source_column
            else await _column_tasks(session, task.project_id, target_column)
        )
        index = len(target) if position is None else max(0, min(position, len(target)))
        if target_column == source_column and index == old_position:
            return task  # same column, same index: nothing to do
        target.insert(index, task)
        task.column = target_column.value
        task.updated_at = utcnow()
        _renumber(source)
        if target is not source:
            _renumber(target)
        affected = {target_column.value: [t.id for t in target]}
        if target_column != source_column:
            affected[source_column.value] = [t.id for t in source]
        audit.record_change(
            session,
            actor_id,
            AuditAction.task_moved,
            "task",
            task.id,
            {"column": [source_column.value, target_column.value], "position": [old_position, index]},
        )
        if target_column != source_column:
            await notifications.notify(
                session,
                recipient_id=task.assignee_id,
                actor_id=actor_id,
                type_=NotificationType.task_moved,
                project_id=task.project_id,
                task_id=task.id,
                task_title=task.title,
                to_column=target_column.value,
            )
        out = (await to_out(session, [task]))[task.id]
        events.queue(
            session,
            "task.moved",
            actor_id=actor_id,
            project_id=task.project_id,
            data={
                "task": out.model_dump(mode="json"),
                "from_column": source_column.value,
                "columns": affected,
            },
        )
        await events.commit_and_publish(session)
        return task


async def _check_assignee(session: AsyncSession, assignee_id: int | None) -> None:
    """Reject an assignee that is not one of the predefined users (FR-012)."""
    if assignee_id is not None and await users.get_user(session, assignee_id) is None:
        raise FieldProblem("assignee_id", "Choose one of the five users, or leave the task unassigned.")


async def create_task(
    session: AsyncSession,
    project_id: int,
    *,
    actor_id: int,
    title: str,
    description: str | None,
    assignee_id: int | None,
) -> Task:
    """Create a task at the bottom of To Do (FR-010). Any user may assign it to any user (FR-012)."""
    async with get_state().write_lock:
        await projects.get_project(session, project_id)  # raises NotFound
        await _check_assignee(session, assignee_id)
        count = (
            await session.execute(
                select(func.count())
                .select_from(Task)
                .where(Task.project_id == project_id, Task.column == Column.todo.value)
            )
        ).scalar_one()
        now = utcnow()
        task = Task(
            project_id=project_id,
            title=title,
            description=description,
            column=Column.todo.value,
            position=count,
            assignee_id=assignee_id,
            created_at=now,
            updated_at=now,
        )
        session.add(task)
        await session.flush()
        audit.record_change(
            session,
            actor_id,
            AuditAction.task_created,
            "task",
            task.id,
            {"title": title, "description": description, "assignee_id": assignee_id},
        )
        if assignee_id is not None:
            audit.record_change(
                session,
                actor_id,
                AuditAction.task_assigned,
                "task",
                task.id,
                {"assignee_id": [None, assignee_id]},
            )
        await notifications.notify(
            session,
            recipient_id=assignee_id,
            actor_id=actor_id,
            type_=NotificationType.task_assigned,
            project_id=project_id,
            task_id=task.id,
            task_title=task.title,
        )
        out = (await to_out(session, [task]))[task.id]
        events.queue(
            session,
            "task.created",
            actor_id=actor_id,
            project_id=project_id,
            data=out.model_dump(mode="json"),
        )
        await events.commit_and_publish(session)
        return task


async def update_task(session: AsyncSession, task_id: int, *, actor_id: int, fields: dict) -> Task:
    """Change title, description and/or assignee; only fields present in `fields` are touched.

    A request that changes nothing writes no audit entry and sends no event.
    """
    async with get_state().write_lock:
        task = await get_task(session, task_id)
        changes: dict[str, list] = {}
        for name in ("title", "description"):
            if name in fields and fields[name] != getattr(task, name):
                changes[name] = [getattr(task, name), fields[name]]
        assignment: list | None = None
        if "assignee_id" in fields:
            await _check_assignee(session, fields["assignee_id"])
            if fields["assignee_id"] != task.assignee_id:
                assignment = [task.assignee_id, fields["assignee_id"]]
        if not changes and assignment is None:
            return task
        for name, (_, new) in changes.items():
            setattr(task, name, new)
        if assignment is not None:
            task.assignee_id = assignment[1]
        task.updated_at = utcnow()
        if changes:
            audit.record_change(session, actor_id, AuditAction.task_updated, "task", task.id, changes)
        if assignment is not None:
            audit.record_change(
                session, actor_id, AuditAction.task_assigned, "task", task.id, {"assignee_id": assignment}
            )
        if assignment is not None:
            await notifications.notify(
                session,
                recipient_id=assignment[1],
                actor_id=actor_id,
                type_=NotificationType.task_assigned,
                project_id=task.project_id,
                task_id=task.id,
                task_title=task.title,
            )
        out = (await to_out(session, [task]))[task.id]
        events.queue(
            session,
            "task.updated",
            actor_id=actor_id,
            project_id=task.project_id,
            data=out.model_dump(mode="json"),
        )
        await events.commit_and_publish(session)
        return task
