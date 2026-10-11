# Quickstart: Taskify Kanban Board

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/) | **Data model**: [data-model.md](data-model.md)

How to run Taskify locally and prove the feature works end to end. Commands are shown for
PowerShell on Windows; use the equivalent paths on macOS or Linux.

## Prerequisites

Versions follow the constitution's Technology Stack (verified on the development machine on
2026-10-11):

- Python 3.12.x (verified 3.12.10); the repo's `.python-version` says `3.12`
- Node.js 24.x LTS (verified 24.14.0) and npm 11.x (verified 11.11.0); the repo's `.nvmrc` says `24`
- Angular CLI 21.x (verified 21.2.0; `npm install -g @angular/cli@21`)
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

Open two browser windows at `http://localhost:4200` to watch live updates and notifications. Each
tab keeps its own selected user, so two tabs can act as two different users; open the second one
fresh rather than duplicating a tab, which copies the selection.

| # | Scenario | Steps | Expected | Covers |
|---|----------|-------|----------|--------|
| 1 | Pick a user | Open the app | Five users, no password; choose Sam Lee → project list with 3 projects | US1-1, US1-2, FR-001, FR-002 |
| 2 | Board and my tasks | Open Customer Portal | Four columns in order; Sam Lee's cards have the "You" chip | US1-3, US1-5, FR-014 |
| 3 | Drag and persist | Drag a To Do card to In Review; reload | Card stays in In Review; the second window updated within 2 s without reload | US1-4, FR-013, FR-015, SC-003 |
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
| 16 | Audit trail | After the steps above, inspect `audit_entries` in `taskify.db` | One entry per change with actor and time; none for no-op moves or notifications | FR-023 |
| 17 | Large board | Run the 200-task load test (`pytest -m perf`) | Board load < 3 s; move reflected < 1 s (see scenario 35 for full conditions) | SC-007 |
| 18 | Keyboard and contrast | Navigate every screen with keyboard only; run an accessibility checker | All actions reachable; no AA contrast failures | FR-025 |
| 19 | Assignment notification | Window A as Alex Morgan, window B as Sam Lee. Alex assigns a task to Sam | Sam's bell count rises within 2 s without reload; panel shows "Alex Morgan assigned you …" | US5-1, FR-026, FR-029, SC-009 |
| 20 | Comment and move notifications | Alex comments on, then moves, a task assigned to Sam | Two more unread notifications for Sam, with comment preview and "to <column>" | US5-1, FR-026 |
| 21 | No self-notifications | As Sam, assign a task to yourself, comment on it, move it | Sam's unread count does not change | US5-2, SC-010 |
| 22 | Open and mark read | As Sam, open the panel, select a notification; then "Mark all as read" | Lands on the task, row becomes read; count goes to 0 and the badge disappears in every Sam tab | US5-3, US5-4, FR-028 |
| 23 | Offline delivery | Close Sam's window; Alex assigns another task; reopen and pick Sam | The new notification is listed as unread | US5-5, FR-029 |
| 24 | Recipient only | `GET /api/v1/notifications` with `X-Taskify-User: <Jordan's id>`; `POST /api/v1/notifications/<Sam's id>/read` as Jordan | Jordan sees only Jordan's list; the POST returns `404 not_found` | FR-031, SC-010 |
| 25 | Deleted comment preview | Alex comments on Sam's task, then deletes the comment | Sam's notification remains and opens the task; no comment text is shown | Edge cases |
| 26 | Retention | Run `pytest -k notification_retention` (creates 105 notifications for one user) | Exactly the newest 100 remain | FR-030 |
| 27 | Empty panel | Pick a user with no notifications and open the bell | "You're all caught up"; "Mark all as read" disabled | Edge cases, design `notifications-empty` |
| 28 | Reconnecting | With the board open, stop the backend for 10 s, move a task in another window after restarting | "Reconnecting…" shows while stopped; after restart it disappears and the board, list and unread count reload | FR-015, edge cases |
| 29 | Edit conflict | Window A starts editing a task's title without saving; window B renames the same task | A keeps its text and shows "<B's user> changed this task"; saving A overwrites | Edge cases |
| 30 | Emoji counting | Create a task whose title is 200 family emoji "👨‍👩‍👧"; then 201 | 200 accepted (counter shows 200 / 200); 201 rejected with the field message | FR-020, research R14 |
| 31 | Refused requests audited | Send a request without `X-Taskify-User`, an invalid task title, and another user's comment edit; inspect `audit_entries` | Three `request.refused` rows with reasons `user_required`, `validation_error`, `not_comment_author`; no submitted text stored | FR-023 |
| 32 | Live project list | Window A on the project list, window B creates a project and moves a task | A shows the new project and updated counts within 2 s | FR-015 |
| 33 | Reduced motion | Turn on the OS "reduce motion" setting; drag a card and open the board while loading | No tilt or shimmer; everything else works | FR-025 |
| 34 | Minimum width | Resize the window to 1024 px | All screens usable; the board scrolls horizontally if needed | FR-025 |
| 35 | Timing conditions | Run `pytest -m perf` (5 WebSocket clients, seeded 200-task board) | Board load < 3 s; move < 1 s for the mover and < 2 s for others; notification < 2 s | SC-003, SC-007, SC-009 |
| 36 | Local only | From another machine on the network, open `http://<dev-machine-ip>:8000/api/v1/health` | Connection refused | Spec Security Considerations |

## 5. Reset local data

Stop the server, delete `backend/taskify.db*`, run `alembic upgrade head`, and start again. The seed
runs because the `users` table is empty.
