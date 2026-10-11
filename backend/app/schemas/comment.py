"""Comment schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.core.text import RequiredText
from app.schemas.common import StrictModel
from app.schemas.user import UserOut


class CommentCreate(StrictModel):
    """Add a comment; the author is always the selected user, never taken from the body (FR-017)."""

    body: RequiredText(2000, "Comment")  # Required, trimmed, 1-2,000 characters


class CommentUpdate(StrictModel):
    """Replace a comment's text (author only, FR-019)."""

    body: RequiredText(2000, "Comment")


class CommentOut(BaseModel):
    """A comment as shown in the task details."""

    id: int
    task_id: int
    author: UserOut
    body: str
    created_at: datetime
    edited_at: datetime | None
