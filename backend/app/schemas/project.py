"""Project schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.text import OptionalText, RequiredText
from app.schemas.common import StrictModel


class ProjectOut(BaseModel):
    """A project as shown in lists and on the board header."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime


class ColumnCounts(BaseModel):
    """Number of tasks in each of the four columns."""

    todo: int
    in_progress: int
    in_review: int
    done: int


class ProjectSummary(ProjectOut):
    """A project with per-column counts and how many tasks are assigned to the selected user."""

    counts: ColumnCounts
    assigned_to_me: int


class ProjectCreate(StrictModel):
    """Create a project; its board always has the four fixed columns (FR-007)."""

    name: RequiredText(100, "Name")  # Required, trimmed, 1-100 characters, unique ignoring case
    description: OptionalText(1000, "Description") = None  # <= 1,000 characters
