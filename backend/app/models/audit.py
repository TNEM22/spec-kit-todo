"""Audit entry model, owned by the `audit` domain (FR-023). Never exposed through the API."""

import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTCDateTime, utcnow
from app.models.base import Base


class AuditAction(enum.StrEnum):
    """What was recorded."""

    project_created = "project.created"
    task_created = "task.created"
    task_updated = "task.updated"
    task_assigned = "task.assigned"
    task_moved = "task.moved"
    comment_created = "comment.created"
    comment_updated = "comment.updated"
    comment_deleted = "comment.deleted"
    request_refused = "request.refused"


class RefusalReason(enum.StrEnum):
    """Why a request was refused (only for `request.refused`)."""

    user_required = "user_required"
    not_comment_author = "not_comment_author"
    validation_error = "validation_error"
    origin_not_allowed = "origin_not_allowed"


class AuditEntry(Base):
    """One recorded change or refused request."""

    __tablename__ = "audit_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    # null only for request.refused without a valid user
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(30))
    entity_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(30), nullable=True)
    route: Mapped[str | None] = mapped_column(String(120), nullable=True)  # never the raw URL or body
    changes: Mapped[str | None] = mapped_column(Text, nullable=True)  # always null for request.refused
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
