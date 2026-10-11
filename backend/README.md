# Taskify Backend

## Responsibility

The backend is the single Python FastAPI application that serves the Taskify API. It owns all
business logic, data storage and WebSocket-based live updates. It is organised into domain modules
(users, projects, tasks, comments, notifications, audit) that each own their tables, models,
schemas and service functions.

## Prerequisites

| Tool | Required version | How to install |
|------|-----------------|----------------|
| Python | 3.12.x (see `.python-version`) | [python.org](https://www.python.org/downloads/) or `pyenv install 3.12` |
| pip | bundled with Python 3.12 | — |

## Set Up

```powershell
# From the repo root
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # Windows PowerShell
# source .venv/bin/activate           # macOS / Linux
pip install -r requirements-dev.txt
copy .env.example .env               # Windows
# cp .env.example .env                # macOS / Linux
```

## Run

```powershell
# From backend/
python -m alembic upgrade head        # create / migrate the database
python -m app.seed                    # seed sample data (idempotent)
python -m app                         # start on http://127.0.0.1:8000
```

The server always binds to `127.0.0.1` (localhost only). It cannot be made to listen on other
interfaces from the CLI entry point (security requirement).

Interactive API docs are available at [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs).

## Test

```powershell
# From backend/
python -m pytest                      # all tests except performance
python -m pytest -m perf              # performance tests (needs seeded perf data)
python -m pytest --tb=short -q        # compact output
```

Tests use a temporary SQLite database per session, migrated with `alembic upgrade head` and seeded
automatically. No external services are required.

## Configuration

Configuration is read from the `.env` file (see `.env.example`). All settings can also be passed
as environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./taskify.db` | SQLAlchemy async database URL |
| `CORS_ORIGINS` | `http://localhost:4200` | Comma-separated allowed origins for CORS and WebSocket |
| `LOG_LEVEL` | `INFO` | Python log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

## Dependencies

Runtime dependencies are pinned in [`requirements.txt`](requirements.txt). Development and test
dependencies (pytest, ruff, mypy, pip-audit) are in [`requirements-dev.txt`](requirements-dev.txt).

Update pinned versions inside the rules of the constitution's Technology Stack section. Run
`pip-audit -r requirements.txt` to check for known vulnerabilities before every release.

## Domain Structure

| Domain | Module | Owns |
|--------|--------|------|
| Users | `app/services/users.py` | `users` table; identity resolution |
| Projects | `app/services/projects.py` | `projects` table; board composition |
| Tasks | `app/services/tasks.py` | `tasks` table; move/renumber logic |
| Comments | `app/services/comments.py` | `comments` table; author-only mutations |
| Notifications | `app/services/notifications.py` | `notifications` table; trigger rules |
| Audit | `app/services/audit.py` | `audit_entries` table; immutable record |

