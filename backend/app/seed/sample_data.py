"""Sample data: five users and three projects (FR-006, SC-008, research R4).

Runs only when the `users` table is empty, so it never resets data. `--perf` additionally creates a
"Performance Board" project with 200 tasks for the SC-007 timing checks.
"""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import utcnow
from app.models.comment import Comment
from app.models.project import Project
from app.models.task import COLUMN_ORDER, Column, Task
from app.models.user import Role, User

USERS = [
    (1, "Alex Morgan", Role.product_manager, "AM", "#C4B5FD"),
    (2, "Sam Lee", Role.engineer, "SL", "#5EEAD4"),
    (3, "Jordan Patel", Role.engineer, "JP", "#F9A8D4"),
    (4, "Riley Chen", Role.engineer, "RC", "#FDBA74"),
    (5, "Taylor Brooks", Role.engineer, "TB", "#93C5FD"),
]
ALEX, SAM, JORDAN, RILEY, TAYLOR = 1, 2, 3, 4, 5

# project name -> (description, {column: [(title, assignee_id | None), ...]})
PROJECTS: dict[str, tuple[str, dict[Column, list[tuple[str, int | None]]]]] = {
    "Customer Portal": (
        "Core customer authentication, billing management, and self-serve settings for enterprise clients.",
        {
            Column.todo: [
                ("Add CSV export to reports", None),
                ("Write release notes", TAYLOR),
                (
                    "Investigate intermittent timeout when exporting large customer invoice "
                    "histories to CSV for enterprise accounts",
                    None,
                ),
                ("Draft help-center article for invoices", JORDAN),
                ("Add dark-mode screenshots to onboarding", ALEX),
                ("Review password reset email wording", None),
            ],
            Column.in_progress: [
                ("Build account settings page", SAM),
                ("Fix date format on invoices", RILEY),
                ("Add pagination to invoice history", JORDAN),
                ("Replace legacy icon set", TAYLOR),
                ("Wire up email preference toggles", SAM),
                ("Document API error codes", ALEX),
            ],
            Column.in_review: [
                ("Update onboarding checklist copy", ALEX),
                ("Refactor search filters", SAM),
                ("Improve loading state on dashboard", RILEY),
                ("Align spacing on billing page", TAYLOR),
                ("Cache customer profile lookups", JORDAN),
                ("Clean up unused invoice templates", None),
            ],
            Column.done: [
                ("Set up error monitoring", JORDAN),
                ("Accessibility audit for dashboard", RILEY),
                ("Migrate sessions to secure cookies", SAM),
                ("Upgrade date picker library", TAYLOR),
                ("Create customer feedback survey", ALEX),
                ("Archive old support macros", None),
            ],
        },
    ),
    "Billing Revamp": (
        "Simplify invoicing and payment reminders.",
        {
            Column.todo: [
                ("Design reminder email schedule", ALEX),
                ("Add tax ID field to invoices", None),
                ("Support multiple payment methods", SAM),
            ],
            Column.in_progress: [
                ("Rebuild invoice PDF layout", RILEY),
                ("Add proration for mid-cycle upgrades", JORDAN),
            ],
            Column.in_review: [
                ("Rotate invoice PDF fonts", TAYLOR),
                ("Validate currency rounding rules", SAM),
            ],
            Column.done: [
                ("Audit legacy billing code", JORDAN),
                ("Write billing glossary", ALEX),
                ("Set up sandbox payment accounts", RILEY),
            ],
        },
    ),
    "Internal Tools": (
        "Small utilities that speed up the team's daily work.",
        {
            Column.todo: [
                ("Script to reset demo data", SAM),
                ("Add standup notes template", ALEX),
            ],
            Column.in_progress: [
                ("Slack digest of open reviews", TAYLOR),
                ("Release checklist generator", JORDAN),
            ],
            Column.in_review: [("Faster local test runner", RILEY), ("Changelog formatter", SAM)],
            Column.done: [
                ("Shared lint configuration", TAYLOR),
                ("Weekly metrics export", RILEY),
                ("Onboarding setup script", JORDAN),
                ("Archive stale branches", None),
            ],
        },
    ),
}

COMMENTS = [
    ("Build account settings page", ALEX, "Please match the layout of the billing settings page.", 52),
    ("Build account settings page", RILEY, "Time zone list is ready in the shared components.", 36),
    ("Refactor search filters", RILEY, "Looks good, one small naming nit.", 20),
]


async def _add_project(
    session: AsyncSession, name: str, description: str, columns: dict[Column, list[tuple[str, int | None]]]
) -> dict[str, Task]:
    """Insert a project with its tasks; positions are gapless per column."""
    project = Project(name=name, name_key=name.casefold(), description=description)
    session.add(project)
    await session.flush()
    created: dict[str, Task] = {}
    base = utcnow() - timedelta(days=10)
    index = 0
    for column in COLUMN_ORDER:
        for position, (title, assignee_id) in enumerate(columns.get(column, [])):
            moment = base + timedelta(hours=index)
            task = Task(
                project_id=project.id,
                title=title,
                column=column,
                position=position,
                assignee_id=assignee_id,
                created_at=moment,
                updated_at=moment,
            )
            session.add(task)
            created[title] = task
            index += 1
    await session.flush()
    return created


async def seed_sample_data(session: AsyncSession) -> bool:
    """Insert the five users and three projects when there are no users. Returns True if seeded."""
    existing = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    if existing:
        return False
    for user_id, name, role, initials, color in USERS:
        session.add(User(id=user_id, display_name=name, role=role, initials=initials, avatar_color=color))
    await session.flush()
    tasks: dict[str, Task] = {}
    for name, (description, columns) in PROJECTS.items():
        tasks.update(await _add_project(session, name, description, columns))
    for title, author_id, body, hours_ago in COMMENTS:
        session.add(
            Comment(
                task_id=tasks[title].id,
                author_id=author_id,
                body=body,
                created_at=utcnow() - timedelta(hours=hours_ago),
            )
        )
    await session.commit()
    return True


async def seed_performance_board(session: AsyncSession, count: int = 200) -> bool:
    """Create the "Performance Board" project with `count` tasks if it does not exist yet."""
    name = "Performance Board"
    found = await session.execute(select(Project.id).where(Project.name_key == name.casefold()))
    if found.first():
        return False
    assignees = [None, ALEX, SAM, JORDAN, RILEY, TAYLOR]
    columns: dict[Column, list[tuple[str, int | None]]] = {c: [] for c in COLUMN_ORDER}
    for i in range(count):
        column = COLUMN_ORDER[i % 4]
        columns[column].append((f"Performance task {i + 1}", assignees[i % len(assignees)]))
    await _add_project(session, name, "200 tasks for timing checks (SC-007).", columns)
    await session.commit()
    return True
