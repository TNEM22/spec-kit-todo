"""Notification endpoints (FR-026 to FR-031). Users see and change only their own notifications."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.identity import require_user
from app.models.user import User
from app.schemas.notification import NotificationList, NotificationOut, UnreadCount
from app.services import notifications

router = APIRouter(dependencies=[Depends(require_user)])


@router.get("/notifications", response_model=NotificationList)
async def list_notifications(
    limit: int = Query(100, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """List your notifications, newest first, with the unread count."""
    return await notifications.list_for_user(session, user.id, limit)


# Registered before the "{notification_id}" route so "read-all" is not parsed as an id.
@router.post("/notifications/read-all", response_model=UnreadCount)
async def read_all(session: AsyncSession = Depends(get_session), user: User = Depends(require_user)):
    """Mark all of your notifications read."""
    return UnreadCount(unread_count=await notifications.mark_all_read(session, user.id))


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def read_one(
    notification_id: int, session: AsyncSession = Depends(get_session), user: User = Depends(require_user)
):
    """Mark one notification read. Someone else's notification returns 404."""
    note = await notifications.mark_read(session, notification_id, user.id)
    return (await notifications.to_out(session, [note]))[0]
