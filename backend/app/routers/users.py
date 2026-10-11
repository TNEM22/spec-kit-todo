"""Users endpoints: the five predefined users (FR-001, FR-004). No create, update or delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.identity import require_user
from app.models.user import User
from app.schemas.user import UserOut
from app.services import users

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
async def list_users(session: AsyncSession = Depends(get_session)):
    """Public: list the five users, Product Manager first, so the start screen can show them."""
    return await users.list_users(session)


@router.get("/users/me", response_model=UserOut)
async def current_user(user: User = Depends(require_user)):
    """Return the selected user; used to check that a stored selection is still valid."""
    return user
