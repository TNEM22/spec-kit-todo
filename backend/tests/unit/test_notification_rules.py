"""Who gets notified, and when (data-model "Creation rules", FR-026, SC-010)."""

from sqlalchemy import select

from app.models.notification import Notification
from app.models.project import Project
from app.services import comments, tasks
from app.services import notifications as notification_service

ALEX, SAM, JORDAN, RILEY, TAYLOR = 1, 2, 3, 4, 5


async def project_id(db) -> int:
    return (await db.execute(select(Project.id).where(Project.name == "Billing Revamp"))).scalar_one()


async def notes(db, recipient: int | None = None) -> list[Notification]:
    query = select(Notification).order_by(Notification.id)
    if recipient is not None:
        query = query.where(Notification.recipient_id == recipient)
    return list((await db.execute(query)).scalars())


async def make_task(db, pid, *, actor=ALEX, assignee=None, title="A task"):
    return await tasks.create_task(
        db, pid, actor_id=actor, title=title, description=None, assignee_id=assignee
    )


async def test_creating_a_task_with_an_assignee_notifies_the_assignee(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM, title="Write release notes")
    found = await notes(db)
    assert len(found) == 1
    note = found[0]
    assert (note.recipient_id, note.actor_id, note.type) == (SAM, ALEX, "task_assigned")
    assert (note.task_id, note.project_id, note.task_title) == (task.id, pid, "Write release notes")
    assert note.to_column is None and note.comment_id is None and note.read_at is None


async def test_no_notification_for_own_actions_or_without_an_assignee(db):
    pid = await project_id(db)
    own = await make_task(db, pid, actor=SAM, assignee=SAM)  # assigning to yourself
    await make_task(db, pid, actor=SAM, assignee=None)
    await tasks.move_task(db, own.id, "done", None, actor_id=SAM)  # moving your own task
    await comments.create_comment(
        db, await tasks.get_task_ref(db, own.id), actor_id=SAM, body="my own comment"
    )
    assert await notes(db) == []


async def test_reassigning_notifies_the_new_assignee_only(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM)
    await tasks.update_task(db, task.id, actor_id=ALEX, fields={"assignee_id": RILEY})
    assert [(n.recipient_id, n.type) for n in await notes(db)] == [
        (SAM, "task_assigned"),
        (RILEY, "task_assigned"),
    ]
    # earlier notifications are not withdrawn
    assert len(await notes(db, SAM)) == 1


async def test_clearing_or_self_assigning_does_not_notify(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM)
    before = len(await notes(db))
    await tasks.update_task(db, task.id, actor_id=ALEX, fields={"assignee_id": None})
    await tasks.update_task(db, task.id, actor_id=ALEX, fields={"assignee_id": ALEX})
    assert len(await notes(db)) == before


async def test_a_comment_notifies_the_assignee_with_a_preview_of_140_characters(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM)
    ref = await tasks.get_task_ref(db, task.id)
    comment = await comments.create_comment(db, ref, actor_id=RILEY, body="x" * 200)
    note = (await notes(db, SAM))[-1]
    assert (note.type, note.actor_id, note.comment_id) == ("task_commented", RILEY, comment.id)
    assert note.comment_preview == "x" * 140


async def test_comment_on_an_unassigned_task_notifies_nobody(db):
    pid = await project_id(db)
    task = await make_task(db, pid, assignee=None)
    await comments.create_comment(db, await tasks.get_task_ref(db, task.id), actor_id=RILEY, body="hi")
    assert await notes(db) == []


async def test_moving_to_another_column_notifies_the_assignee(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM)
    await tasks.move_task(db, task.id, "in_review", None, actor_id=JORDAN)
    note = (await notes(db, SAM))[-1]
    assert (note.type, note.actor_id, note.to_column) == ("task_moved", JORDAN, "in_review")


async def test_reordering_inside_the_same_column_does_not_notify(db):
    pid = await project_id(db)
    first = await make_task(db, pid, actor=ALEX, assignee=SAM, title="first")
    await make_task(db, pid, actor=ALEX, assignee=None, title="second")
    before = len(await notes(db))
    await tasks.move_task(db, first.id, "todo", 99, actor_id=JORDAN)  # moves to the bottom of To Do
    assert len(await notes(db)) == before


async def test_edits_to_title_description_and_comments_do_not_notify(db):
    pid = await project_id(db)
    task = await make_task(db, pid, actor=ALEX, assignee=SAM)
    comment = await comments.create_comment(
        db, await tasks.get_task_ref(db, task.id), actor_id=RILEY, body="a"
    )
    before = len(await notes(db))
    ref = await tasks.get_task_ref(db, task.id)
    await tasks.update_task(db, task.id, actor_id=RILEY, fields={"title": "New", "description": "More"})
    await comments.update_comment(db, comment, ref, actor_id=RILEY, body="b")
    await comments.delete_comment(db, comment, ref, actor_id=RILEY)
    assert len(await notes(db)) == before


async def test_notification_retention_keeps_exactly_the_newest_100(db):
    pid = await project_id(db)
    for i in range(105):
        await make_task(db, pid, actor=ALEX, assignee=SAM, title=f"Task {i}")
    kept = await notes(db, SAM)
    assert len(kept) == 100
    titles = [n.task_title for n in kept]
    assert titles[0] == "Task 5" and titles[-1] == "Task 104"  # the oldest five were removed
    assert await notification_service.unread_count(db, SAM) == 100
