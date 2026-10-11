"""Notifications domain: owns the `notifications` table (FR-026 to FR-031, research R7).

`notify` runs inside the caller's transaction (it never commits), so a notification exists exactly
when the change that caused it commits. Each recipient keeps only their newest 100. Notifications are
visible and changeable only by their recipient; others get "not found". They are not audited: they
are a side effect of audited changes and read state is personal.
"""

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import utcnow
from app.core.errors import NotFound
from app.core.state import get_state
from app.core.text import truncate_graphemes
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationList, NotificationOut, ProjectRef
from app.schemas.user import UserOut
from app.services import events, projects, users

KEEP_PER_USER = 100
PREVIEW_CHARACTERS = 140


async def unread_count(session: AsyncSession, user_id: int) -> int:
    """Return the number of unread notifications for `user_id`."""
    result = await session.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == user_id, Notification.read_at.is_(None))
    )
    return int(result.scalar_one())


async def to_out(session: AsyncSession, items: list[Notification]) -> list[NotificationOut]:
    """Build `NotificationOut` objects with actors and project names."""
    actors = await users.get_users_by_ids(session, [n.actor_id for n in items])
    names = await projects.names_by_ids(session, [n.project_id for n in items])
    return [
        NotificationOut(
            id=n.id,
            type=n.type,
            actor=UserOut.model_validate(actors[n.actor_id]),
            project=ProjectRef(id=n.project_id, name=names[n.project_id]),
            task_id=n.task_id,
            task_title=n.task_title,
            to_column=n.to_column,
            comment_preview=n.comment_preview,
            created_at=n.created_at,
            read=n.read_at is not None,
        )
        for n in items
    ]


async def notify(
    session: AsyncSession,
    *,
    recipient_id: int | None,
    actor_id: int,
    type_: NotificationType,
    project_id: int,
    task_id: int,
    task_title: str,
    to_column: str | None = None,
    comment_id: int | None = None,
    comment_body: str | None = None,
) -> Notification | None:
    """Notify `recipient_id` about a change to their task, unless that would be pointless.

    Nobody is notified about their own actions (FR-026), and a task without an assignee notifies no
    one. Runs in the caller's transaction and queues a `notification.created` event for the recipient.
    """
    if recipient_id is None or recipient_id == actor_id:
        return None
    note = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=type_.value,
        project_id=project_id,
        task_id=task_id,
        task_title=task_title,
        to_column=to_column,
        comment_id=comment_id,
        comment_preview=truncate_graphemes(comment_body, PREVIEW_CHARACTERS) if comment_body else None,
        created_at=utcnow(),
    )
    session.add(note)
    await session.flush()
    await _trim(session, recipient_id)
    out = (await to_out(session, [note]))[0]
    events.queue(
        session,
        "notification.created",
        actor_id=actor_id,
        project_id=project_id,
        recipient_id=recipient_id,
        data={
            "notification": out.model_dump(mode="json"),
            "unread_count": await unread_count(session, recipient_id),
        },
    )
    return note


async def _trim(session: AsyncSession, user_id: int) -> None:
    """Delete everything beyond the newest 100 notifications of `user_id` (FR-030)."""
    stale = await session.execute(
        select(Notification.id)
        .where(Notification.recipient_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(KEEP_PER_USER)
    )
    ids = list(stale.scalars())
    if ids:
        await session.execute(Notification.__table__.delete().where(Notification.id.in_(ids)))


async def clear_comment_preview(session: AsyncSession, comment_id: int) -> None:
    """Remove the comment text from notifications about a comment that was deleted."""
    await session.execute(
        update(Notification).where(Notification.comment_id == comment_id).values(comment_preview=None)
    )


async def list_for_user(session: AsyncSession, user_id: int, limit: int = KEEP_PER_USER) -> NotificationList:
    """Return the user's notifications newest first, with the unread count."""
    rows = await session.execute(
        select(Notification)
        .where(Notification.recipient_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
    )
    return NotificationList(
        items=await to_out(session, list(rows.scalars())), unread_count=await unread_count(session, user_id)
    )


async def mark_read(session: AsyncSession, notification_id: int, user_id: int) -> Notification:
    """Mark one of the user's notifications read (idempotent). Another user's id is "not found"."""
    async with get_state().write_lock:
        note = await session.get(Notification, notification_id) if notification_id > 0 else None
        if note is None or note.recipient_id != user_id:
            raise NotFound()
        if note.read_at is None:
            note.read_at = utcnow()
            await session.flush()  # so the count below already excludes this notification
            events.queue(
                session,
                "notifications.read",
                actor_id=user_id,
                project_id=None,
                recipient_id=user_id,
                data={"ids": [note.id], "unread_count": await unread_count(session, user_id)},
            )
            await events.commit_and_publish(session)
        return note


async def mark_all_read(session: AsyncSession, user_id: int) -> int:
    """Mark all of the user's notifications read and return the new unread count (0)."""
    async with get_state().write_lock:
        result = await session.execute(
            update(Notification)
            .where(Notification.recipient_id == user_id, Notification.read_at.is_(None))
            .values(read_at=utcnow())
        )
        if result.rowcount:
            events.queue(
                session,
                "notifications.read",
                actor_id=user_id,
                project_id=None,
                recipient_id=user_id,
                data={"ids": "all", "unread_count": 0},
            )
            await events.commit_and_publish(session)
        return 0
