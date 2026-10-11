"""Task model, owned by the `tasks` domain."""

import enum
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTCDateTime, utcnow
from app.models.base import Base


class Column(enum.StrEnum):
    """The four fixed board columns, in board order (FR-009)."""

    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"


COLUMN_ORDER = [Column.todo, Column.in_progress, Column.in_review, Column.done]


class Task(Base):
    """A unit of work inside one project."""

    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("\"column\" IN ('todo','in_progress','in_review','done')", name="column_values"),
        CheckConstraint("position >= 0", name="position_nonnegative"),
        Index("ix_tasks_board", "project_id", "column", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(Text)  # Required, trimmed, 1-200 characters
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # <= 5,000 characters
    column: Mapped[Column] = mapped_column(String(20), default=Column.todo)
    position: Mapped[int] = mapped_column(Integer)  # Gapless 0..n-1 within (project_id, column)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
