# Quickstart: Taskify Kanban Board

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/) | **Data model**: [data-model.md](data-model.md)

How to run Taskify locally and prove the feature works end to end. Commands are shown for
PowerShell on Windows; use the equivalent paths on macOS or Linux.

## Prerequisites

- Python 3.12
- Node.js LTS supported by Angular 21, with npm
- Angular CLI 21 (`npm install -g @angular/cli@21`)
- No Docker and no database server: SQLite is a local file

## 1. Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env          # DATABASE_URL, CORS_ORIGINS, LOG_LEVEL
alembic upgrade head                 # creates taskify.db with WAL enabled
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected:

- Startup log line (JSON) reports seeding of 5 users and 3 projects on the first run only.
- `GET http://127.0.0.1:8000/api/v1/health` → `{"status": "ok", "database": "ok"}`.
- API docs at `http://127.0.0.1:8000/api/v1/docs`.

## 2. Frontend setup

```powershell
cd frontend
npm ci
npm run api:generate     # regenerates the typed client from src/app/core/api/openapi.json
npm start                # ng serve on http://localhost:4200
```

After any API change: run `python -m app.scripts.export_openapi` in `backend`, then
`npm run api:generate`.

## 3. Automated checks

```powershell
# backend
cd backend; pytest
# frontend
cd frontend; ng test --watch=false; ng lint
# dependency scans
cd backend; pip-audit -r requirements.txt
cd frontend; npm audit --audit-level=high
```

Expected: all tests pass, including the OpenAPI drift test (research R10).

## 4. End-to-end validation scenarios

Open two browser windows at `http://localhost:4200` to watch real-time updates.

| # | Scenario | Steps | Expected | Covers |
|---|----------|-------|----------|--------|
| 1 | Pick a user | Open the app | Five users, no password; choose Sam Lee → project list with 3 projects | US1-1, US1-2, FR-001, FR-002 |
| 2 | Board and my tasks | Open Customer Portal | Four columns in order; Sam Lee's cards have the "You" chip | US1-3, US1-5, FR-014 |
| 3 | Drag and persist | Drag a To Do card to In Review; reload | Card stays in In Review; the second window updated without reload | US1-4, FR-013, FR-015, SC-003 |
| 4 | Keyboard move | Tab to a card, open "Move to", choose Done | Card moves to the bottom of Done | FR-013, FR-025 |
| 5 | Selection persistence | Reload, then close the tab and reopen | Reload keeps Sam Lee; new tab shows user selection | FR-002 clarification |
| 6 | Switch user | Click "Switch user", pick Riley Chen | Riley's cards now show "You" | US1-6, FR-003 |
| 7 | Create and assign | New task "Write release notes", assign Taylor Brooks; then reassign to Unassigned | Appears at bottom of To Do; assignee updates | US2-1 to US2-3, FR-010, FR-012 |
| 8 | Task validation | Submit a title of spaces; then 201 characters | Not created; clear field message; nothing saved | US2-4, FR-020 |
| 9 | Comments | Add a comment as Sam; switch to Jordan | Jordan sees it with no Edit/Delete | US3-1, US3-3, FR-019 |
| 10 | Edit and delete own comment | As Sam, edit then delete the comment | "edited" marker; then removed in both windows | US3-2, clarification Q4 |
| 11 | Forbidden comment edit | `PATCH /api/v1/comments/<Sam's id>` with header `X-Taskify-User: <Jordan's id>` | `403 not_comment_author`, comment unchanged | FR-019, SC-006 |
| 12 | Markup is text | Comment `<script>alert(1)</script>` | Shown literally; no script runs | FR-021 |
| 13 | Create project | New project "Mobile App"; then "mobile app" again | Empty four-column board; second attempt shows duplicate-name error | US4-1, US4-2 |
| 14 | No user header | `GET /api/v1/projects` without `X-Taskify-User` | `401 user_required` | FR-005 |
| 15 | Stale link | Open `/projects/1/tasks/99999` | "Not found" toast; drawer closes | Edge cases, FR-022 |
| 16 | Audit trail | After the steps above, inspect `audit_entries` in `taskify.db` | One entry per change with actor and time; none for no-op moves | FR-023 |
| 17 | Large board | Run the 200-task load test (`pytest -m perf`) | Board load < 3 s; move reflected < 1 s | SC-007 |
| 18 | Keyboard and contrast | Navigate every screen with keyboard only; run an accessibility checker | All actions reachable; no AA contrast failures | FR-025 |

## 5. Reset local data

Stop the server, delete `backend/taskify.db*`, run `alembic upgrade head`, and start again. The seed
runs because the `users` table is empty.
