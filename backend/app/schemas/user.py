"""User schemas."""

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    """A predefined user as shown in the UI."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: str
    initials: str
    avatar_color: str
