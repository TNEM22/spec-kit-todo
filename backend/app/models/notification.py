"""Notification model, owned by the `notifications` domain (FR-026 to FR-031)."""

import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTCDateTime, utcnow
from app.models.base import Base


class NotificationType(enum.StrEnum):
    """The three events that notify a user about their own work."""

    task_assigned = "task_assigned"
    task_commented = "task_commented"
    task_moved = "task_moved"


class Notification(Base):
    """A message to one user about another user's change to their work."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_panel", "recipient_id", "created_at", "id"),
        Index("ix_notifications_unread", "recipient_id", "read_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # The task's assignee at the time of the change; never equals actor_id.
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    task_title: Mapped[str] = mapped_column(Text)  # snapshot of the title when created (FR-027)
    to_column: Mapped[str | None] = mapped_column(String(20), nullable=True)  # set only for task_moved
    comment_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # not a FK: comments can be deleted
    # First 140 characters of the comment (grapheme count); cleared when the comment is deleted.
    comment_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)  # None means unread
