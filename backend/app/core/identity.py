"""Identity without login: the selected user arrives in `X-Taskify-User` (research R2).

This is an identity choice, not authentication. Every route except the public ones requires a valid
selected user (deny by default, Constitution I).
"""

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import UserRequired
from app.models.user import User
from app.services import users

HEADER = "x-taskify-user"


async def require_user(request: Request, session: AsyncSession = Depends(get_session)) -> User:
    """Return the selected user or raise `UserRequired` (401) when missing, malformed or unknown."""
    raw = request.headers.get(HEADER, "").strip()
    if not raw.isascii() or not raw.isdigit():
        raise UserRequired()
    user = await users.get_user(session, int(raw))
    if user is None:
        raise UserRequired()
    request.state.actor_id = user.id  # lets error handlers audit refusals with the actor
    return user
