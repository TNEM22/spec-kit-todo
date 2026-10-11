"""Project endpoints: list, detail and board (FR-006 to FR-009)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.identity import require_user
from app.models.task import COLUMN_ORDER
from app.models.user import User
from app.schemas.project import ColumnCounts, ProjectCreate, ProjectOut, ProjectSummary
from app.schemas.task import BoardColumns, BoardOut
from app.services import projects, tasks

router = APIRouter(dependencies=[Depends(require_user)])


@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects(session: AsyncSession = Depends(get_session), user: User = Depends(require_user)):
    """List all projects with per-column task counts and how many tasks are assigned to you."""
    found = await projects.list_projects(session)
    counts = await tasks.column_counts(session, [p.id for p in found], user.id)
    return [
        ProjectSummary(
            **ProjectOut.model_validate(project).model_dump(),
            counts=ColumnCounts(**counts[project.id][0]),
            assigned_to_me=counts[project.id][1],
        )
        for project in found
    ]


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int, session: AsyncSession = Depends(get_session)):
    """Return one project."""
    return await projects.get_project(session, project_id)


@router.get("/projects/{project_id}/board", response_model=BoardOut)
async def get_board(project_id: int, session: AsyncSession = Depends(get_session)):
    """Return the project's board: four fixed columns, each ordered by position."""
    project = await projects.get_project(session, project_id)
    by_column = await tasks.list_board(session, project_id)
    outs = await tasks.to_out(session, [t for column in COLUMN_ORDER for t in by_column[column]])
    return BoardOut(
        project=ProjectOut.model_validate(project),
        columns=BoardColumns(**{c.value: [outs[t.id] for t in by_column[c]] for c in COLUMN_ORDER}),
    )


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate, session: AsyncSession = Depends(get_session), user: User = Depends(require_user)
):
    """Create a project. A name already used (ignoring letter case) returns 409."""
    return await projects.create_project(
        session, actor_id=user.id, name=body.name, description=body.description
    )
