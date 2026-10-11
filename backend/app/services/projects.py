"""Projects domain: owns the `projects` table (FR-006 to FR-008).

Projects are visible to all users. There is no update or delete in this phase.
"""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import utcnow
from app.core.errors import NotFound, ProjectNameTaken
from app.core.state import get_state
from app.models.audit import AuditAction
from app.models.project import Project
from app.schemas.project import ProjectOut
from app.services import audit, events


async def list_projects(session: AsyncSession) -> list[Project]:
    """Return all projects ordered by creation time."""
    result = await session.execute(select(Project).order_by(Project.created_at, Project.id))
    return list(result.scalars())


async def get_project(session: AsyncSession, project_id: int) -> Project:
    """Return a project or raise `NotFound`."""
    project = await session.get(Project, project_id) if project_id > 0 else None
    if project is None:
        raise NotFound()
    return project


async def names_by_ids(session: AsyncSession, project_ids: Iterable[int]) -> dict[int, str]:
    """Return project names keyed by id (used to label notifications)."""
    ids = {i for i in project_ids}
    if not ids:
        return {}
    rows = await session.execute(select(Project.id, Project.name).where(Project.id.in_(ids)))
    return {pid: name for pid, name in rows.all()}


async def create_project(
    session: AsyncSession, *, actor_id: int, name: str, description: str | None
) -> Project:
    """Create a project; names are unique ignoring letter case (FR-007).

    Raises `ProjectNameTaken` when another project already uses the name.
    """
    key = name.casefold()
    async with get_state().write_lock:
        taken = await session.execute(select(Project.id).where(Project.name_key == key))
        if taken.first() is not None:
            raise ProjectNameTaken(name)
        project = Project(name=name, name_key=key, description=description, created_at=utcnow())
        session.add(project)
        await session.flush()
        audit.record_change(
            session,
            actor_id,
            AuditAction.project_created,
            "project",
            project.id,
            {"name": name, "description": description},
        )
        events.queue(
            session,
            "project.created",
            actor_id=actor_id,
            project_id=project.id,
            data=ProjectOut.model_validate(project).model_dump(mode="json"),
        )
        await events.commit_and_publish(session)
        return project
