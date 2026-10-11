"""Comment endpoints (FR-017 to FR-019). Only a comment's author may edit or delete it."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.identity import require_user
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentOut, CommentUpdate
from app.services import comments, tasks

router = APIRouter(dependencies=[Depends(require_user)])


@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
async def list_comments(task_id: int, session: AsyncSession = Depends(get_session)):
    """List a task's comments, oldest first."""
    await tasks.get_task_ref(session, task_id)  # 404 when the task does not exist
    return await comments.to_out(session, await comments.list_comments(session, task_id))


@router.post("/tasks/{task_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    task_id: int,
    body: CommentCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """Add a comment; its author is the selected user."""
    ref = await tasks.get_task_ref(session, task_id)
    comment = await comments.create_comment(session, ref, actor_id=user.id, body=body.body)
    return (await comments.to_out(session, [comment]))[0]


@router.patch("/comments/{comment_id}", response_model=CommentOut)
async def edit_comment(
    comment_id: int,
    body: CommentUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """Edit your own comment; anyone else gets 403."""
    comment = await comments.get_comment(session, comment_id)
    ref = await tasks.get_task_ref(session, comment.task_id)
    comment = await comments.update_comment(session, comment, ref, actor_id=user.id, body=body.body)
    return (await comments.to_out(session, [comment]))[0]


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int, session: AsyncSession = Depends(get_session), user: User = Depends(require_user)
):
    """Delete your own comment for everyone; anyone else gets 403."""
    comment = await comments.get_comment(session, comment_id)
    ref = await tasks.get_task_ref(session, comment.task_id)
    await comments.delete_comment(session, comment, ref, actor_id=user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
