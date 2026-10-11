"""Users domain: owns the `users` table. Users are fixed sample data in this phase (FR-001, FR-004)."""

from collections.abc import Iterable

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Role, User


async def list_users(session: AsyncSession) -> list[User]:
    """Return all users, Product Manager first, then by id."""
    order = case((User.role == Role.product_manager, 0), else_=1)
    result = await session.execute(select(User).order_by(order, User.id))
    return list(result.scalars())


async def get_user(session: AsyncSession, user_id: int) -> User | None:
    """Return one user or None."""
    return await session.get(User, user_id)


async def get_users_by_ids(session: AsyncSession, ids: Iterable[int]) -> dict[int, User]:
    """Return the users with the given ids as a mapping id -> User."""
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    result = await session.execute(select(User).where(User.id.in_(wanted)))
    return {user.id: user for user in result.scalars()}


async def count_users(session: AsyncSession) -> int:
    """Return the number of users (used to decide whether to seed)."""
    result = await session.execute(select(func.count()).select_from(User))
    return int(result.scalar_one())
