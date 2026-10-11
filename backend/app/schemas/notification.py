"""Notification schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class ProjectRef(BaseModel):
    """The project a notification belongs to."""

    id: int
    name: str


class NotificationOut(BaseModel):
    """A notification as shown in the panel."""

    id: int
    type: str  # task_assigned | task_commented | task_moved
    actor: UserOut
    project: ProjectRef
    task_id: int
    task_title: str  # the title when the event happened
    to_column: str | None
    comment_preview: str | None
    created_at: datetime
    read: bool


class NotificationList(BaseModel):
    """The panel contents: newest first, plus the unread count for the bell badge."""

    items: list[NotificationOut]
    unread_count: int


class UnreadCount(BaseModel):
    """Result of marking everything read."""

    unread_count: int
