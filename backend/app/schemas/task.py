"""Task and board schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.text import OptionalText, RequiredText
from app.models.task import Column
from app.schemas.common import StrictModel
from app.schemas.project import ProjectOut
from app.schemas.user import UserOut


class TaskOut(BaseModel):
    """A task as shown on cards and in the task details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None
    column: Column
    position: int
    assignee: UserOut | None
    created_at: datetime
    updated_at: datetime
    # Used only for the "Comments · N" heading in the task details, never shown on cards.
    comment_count: int


class TaskRef(BaseModel):
    """The few task facts other domains need (comments, notifications) without sharing the model."""

    id: int
    project_id: int
    title: str
    assignee_id: int | None


class BoardColumns(BaseModel):
    """The four columns in board order, each with its tasks ordered by position."""

    todo: list[TaskOut]
    in_progress: list[TaskOut]
    in_review: list[TaskOut]
    done: list[TaskOut]


class BoardOut(BaseModel):
    """A project board."""

    project: ProjectOut
    columns: BoardColumns


class TaskCreate(StrictModel):
    """Create a task in a project; it starts at the bottom of To Do (FR-010)."""

    title: RequiredText(200, "Title")  # Required, trimmed, 1-200 characters
    description: OptionalText(5000, "Description") = None  # <= 5,000 characters; empty becomes null
    assignee_id: int | None = None


class TaskUpdate(StrictModel):
    """Change any of title, description and assignee; `assignee_id: null` clears it (FR-011, FR-012)."""

    title: RequiredText(200, "Title") | None = None
    description: OptionalText(5000, "Description") = None
    assignee_id: int | None = None

    @model_validator(mode="after")
    def _at_least_one_valid_field(self) -> "TaskUpdate":
        """Reject an empty body and an explicit null title."""
        if not self.model_fields_set:
            raise ValueError("Send at least one of title, description or assignee_id.")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Title is required. Enter 1 to 200 characters.")
        return self


class MoveRequest(StrictModel):
    """Move a task to a column; `position` is the target index, omitted means the bottom."""

    column: Column
    position: int | None = Field(default=None, ge=0)
