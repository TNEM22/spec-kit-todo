"""Comments domain: owns the `comments` table (FR-017 to FR-019).

Only a comment's author may edit or delete it. Other domains pass in a `TaskRef`; this module never
imports the Task model.
"""

from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import utcnow
from app.core.errors import NotCommentAuthor, NotFound
from app.core.state import get_state
from app.models.audit import AuditAction
from app.models.comment import Comment
from app.models.notification import NotificationType
from app.schemas.comment import CommentOut
from app.schemas.task import TaskRef
from app.schemas.user import UserOut
from app.services import audit, events, notifications, users


async def count_by_task(session: AsyncSession, task_ids: Iterable[int]) -> dict[int, int]:
    """Return the number of comments for each task id (tasks without comments map to 0)."""
    ids = list(task_ids)
    if not ids:
        return {}
    rows = await session.execute(
        select(Comment.task_id, func.count()).where(Comment.task_id.in_(ids)).group_by(Comment.task_id)
    )
    counts = {task_id: 0 for task_id in ids}
    counts.update({task_id: count for task_id, count in rows.all()})
    return counts


async def get_comment(session: AsyncSession, comment_id: int) -> Comment:
    """Return a comment or raise `NotFound` (ids below 1 never exist)."""
    comment = await session.get(Comment, comment_id) if comment_id > 0 else None
    if comment is None:
        raise NotFound()
    return comment


async def list_comments(session: AsyncSession, task_id: int) -> list[Comment]:
    """Return a task's comments oldest first (FR-018); the caller checks that the task exists."""
    rows = await session.execute(
        select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at, Comment.id)
    )
    return list(rows.scalars())


async def to_out(session: AsyncSession, items: Iterable[Comment]) -> list[CommentOut]:
    """Build `CommentOut` objects with their authors."""
    comments = list(items)
    authors = await users.get_users_by_ids(session, [c.author_id for c in comments])
    return [
        CommentOut(
            id=c.id,
            task_id=c.task_id,
            author=UserOut.model_validate(authors[c.author_id]),
            body=c.body,
            created_at=c.created_at,
            edited_at=c.edited_at,
        )
        for c in comments
    ]


async def create_comment(session: AsyncSession, ref: TaskRef, *, actor_id: int, body: str) -> Comment:
    """Add a comment to the task described by `ref`; the author is the selected user (FR-017)."""
    async with get_state().write_lock:
        comment = Comment(task_id=ref.id, author_id=actor_id, body=body, created_at=utcnow())
        session.add(comment)
        await session.flush()
        audit.record_change(
            session, actor_id, AuditAction.comment_created, "comment", comment.id, {"body": body}
        )
        await notifications.notify(
            session,
            recipient_id=ref.assignee_id,
            actor_id=actor_id,
            type_=NotificationType.task_commented,
            project_id=ref.project_id,
            task_id=ref.id,
            task_title=ref.title,
            comment_id=comment.id,
            comment_body=body,
        )
        out = (await to_out(session, [comment]))[0]
        events.queue(
            session,
            "comment.created",
            actor_id=actor_id,
            project_id=ref.project_id,
            data=out.model_dump(mode="json"),
        )
        await events.commit_and_publish(session)
        return comment


async def update_comment(
    session: AsyncSession, comment: Comment, ref: TaskRef, *, actor_id: int, body: str
) -> Comment:
    """Replace the text of one's own comment and mark it edited (FR-019)."""
    if comment.author_id != actor_id:
        raise NotCommentAuthor()
    async with get_state().write_lock:
        old = comment.body
        comment.body = body
        comment.edited_at = utcnow()
        audit.record_change(
            session, actor_id, AuditAction.comment_updated, "comment", comment.id, {"body": [old, body]}
        )
        out = (await to_out(session, [comment]))[0]
        events.queue(
            session,
            "comment.updated",
            actor_id=actor_id,
            project_id=ref.project_id,
            data=out.model_dump(mode="json"),
        )
        await events.commit_and_publish(session)
        return comment


async def delete_comment(session: AsyncSession, comment: Comment, ref: TaskRef, *, actor_id: int) -> None:
    """Delete one's own comment for everyone; the audit entry keeps the removed text (FR-019)."""
    if comment.author_id != actor_id:
        raise NotCommentAuthor()
    async with get_state().write_lock:
        comment_id, task_id, body = comment.id, comment.task_id, comment.body
        await session.delete(comment)
        await notifications.clear_comment_preview(session, comment_id)
        audit.record_change(
            session, actor_id, AuditAction.comment_deleted, "comment", comment_id, {"body": body}
        )
        events.queue(
            session,
            "comment.deleted",
            actor_id=actor_id,
            project_id=ref.project_id,
            data={"comment_id": comment_id, "task_id": task_id},
        )
        await events.commit_and_publish(session)
