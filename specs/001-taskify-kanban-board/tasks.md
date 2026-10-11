---

description: "Task list for Taskify Kanban Board (001-taskify-kanban-board)"
---

# Tasks: Taskify Kanban Board

**Input**: Design documents from `/specs/001-taskify-kanban-board/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (rest-api.md, websocket.md,
ui-screens.md), quickstart.md, design/ (manifest.md, tokens.md, screens/)

**Tests**: Included. The constitution requires validation tests with malformed and malicious input
(Principle II) and contract tests for both the backend contract and the generated client (Quality
Gates); spec SC-005 requires "a test set covering every input field". Write each story's tests first
and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and
demonstrated on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: User story the task belongs to (US1–US5)
- Paths: backend in `backend/app/`, backend tests in `backend/tests/`, frontend in `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create both projects with the versions fixed by the constitution's Technology Stack.

- [X] T001 Create repository-root `.nvmrc` containing `24`, `.python-version` containing `3.12`, and add ignores to `.gitignore` for `backend/.venv/`, `backend/.env`, `backend/taskify.db*`, `backend/test*.db*`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.angular/`
- [X] T002 Create `backend/pyproject.toml` (`requires-python = ">=3.12,<3.13"`; pytest config with `asyncio_mode = "auto"` and marker `perf`; ruff with pydocstyle rules `D100`–`D103` enabled so every public module, class and function needs a docstring (Constitution IV); mypy settings), `backend/requirements.txt` with pinned latest-stable `fastapi`, `uvicorn[standard]`, `pydantic>=2,<3`, `pydantic-settings`, `sqlalchemy>=2,<3`, `aiosqlite`, `alembic`, `regex`, and `backend/requirements-dev.txt` (`-r requirements.txt` plus pinned `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `mypy`, `pip-audit`)
- [X] T003 Create backend package folders with a module docstring stating what each owns: `backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/app/models/__init__.py`, `backend/app/schemas/__init__.py`, `backend/app/services/__init__.py`, `backend/app/routers/__init__.py`, `backend/app/realtime/__init__.py`, `backend/app/seed/__init__.py`, `backend/app/scripts/__init__.py`, `backend/tests/__init__.py`; add `backend/.env.example` with `DATABASE_URL=sqlite+aiosqlite:///./taskify.db`, `CORS_ORIGINS=http://localhost:4200`, `LOG_LEVEL=INFO`
- [X] T004 [P] Scaffold the Angular 21 workspace in `frontend/` with the Angular CLI 21 (standalone, routing, plain CSS, no SSR, strict TypeScript ~5.9, zoneless, Vitest default runner); add `"engines": { "node": ">=24 <25" }` to `frontend/package.json`; install `@angular/cdk@21` and `ng-openapi-gen` (dev); add scripts `start`, `test`, `lint`, `api:generate`; commit `frontend/package-lock.json`
- [X] T005 [P] Add Angular ESLint to `frontend/eslint.config.js` with rules that forbid `[innerHTML]` bindings and any `bypassSecurityTrust*` call (FR-021, research R8), plus `eslint-plugin-jsdoc` requiring TSDoc on exported classes, functions and services (Constitution IV)
- [X] T006 [P] Initialise Alembic with the async template in `backend/alembic/` and `backend/alembic.ini`; in `backend/alembic/env.py` read `DATABASE_URL` from settings, import `app.models` metadata, and set `render_as_batch=True` (research R4)
- [ ] T007 [P] Create `backend/README.md` and `frontend/README.md` with sections: responsibility, prerequisites (Python 3.12 / Node 24, npm 11, Angular CLI 21), run, test, configuration, dependencies (Constitution IV)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure every story needs: settings, database, shared models, validation,
errors and audit, identity, live-update channel, seed data, frontend shell, design tokens, shared UI.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend core

- [X] T008 Implement `Settings` in `backend/app/core/config.py` with pydantic-settings: `database_url`, `cors_origins: list[str]`, `log_level`; document that the server is started with `--host 127.0.0.1` only (spec Security Considerations)
- [X] T009 Implement `backend/app/core/db.py`: async engine and session factory from `DATABASE_URL`, `get_session` dependency, a `connect` listener that (SQLite only) runs `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, `PRAGMA busy_timeout=5000`, `PRAGMA synchronous=NORMAL`, and a `UTCDateTime` TypeDecorator storing timezone-aware UTC (research R3)
- [X] T010 [P] Implement JSON structured logging in `backend/app/core/logging.py` with a `request_id` context variable added to every line; never log request bodies, comment text or headers other than `X-Request-ID` (research R12)
- [X] T011 [P] Implement text rules in `backend/app/core/text.py`: NFC-normalise, `str.strip()` (removes spaces, tabs, line breaks, non-breaking spaces), count length as grapheme clusters with `len(regex.findall(r"\X", text))`, treat whitespace-only as empty; expose reusable Pydantic `Annotated` types `RequiredText(max)` (1–max characters) and `OptionalText(max)` (≤ max, empty → `None`) (FR-020, research R14)
- [X] T012 [P] Implement in-process counters in `backend/app/core/metrics.py` (requests by route template and status, latency buckets, open WebSocket count)
- [X] T013 Implement `backend/app/core/middleware.py`: read or create `X-Request-ID` and echo it; add `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'` to API responses; record metrics (research R12, R13)
- [X] T014 Create `backend/app/models/base.py` with SQLAlchemy 2.x `DeclarativeBase` and shared `UTCDateTime` columns
- [X] T015 [P] Create `User` model in `backend/app/models/user.py`: `id` integer PK "Assigned by seed"; `display_name` string(60) "Required, unique"; `role` enum `product_manager` | `engineer` "Required"; `initials` string(3) "Required"; `avatar_color` string(7) hex
- [X] T016 [P] Create `Project` model in `backend/app/models/project.py`: `id` PK; `name` text "Required, trimmed, 1–100 characters"; `name_key` text unique index "`casefold()` of trimmed name"; `description` text nullable "Trimmed, ≤ 1,000 characters; empty string stored as null"; `created_at` UTC
- [X] T017 [P] Create `Task` model in `backend/app/models/task.py`: `project_id` FK indexed; `title` text "Required, trimmed, 1–200 characters"; `description` text nullable "≤ 5,000 characters; empty string stored as null"; `column` enum `todo` | `in_progress` | `in_review` | `done` default `todo` with a check constraint; `position` integer ≥ 0 "Gapless 0..n-1 within `(project_id, column)`"; `assignee_id` FK → User nullable; `created_at`, `updated_at` ("Set on every change, including moves"); index `(project_id, column, position)`
- [X] T018 [P] Create `Comment` model in `backend/app/models/comment.py`: `task_id` FK indexed; `author_id` FK → User "Set from the selected user, never from the request body"; `body` text "Required, trimmed, 1–2,000 characters"; `created_at`; `edited_at` nullable "non-null means edited"
- [X] T019 [P] Create `AuditEntry` model in `backend/app/models/audit.py`: `occurred_at` indexed; `actor_id` FK nullable "null only for `request.refused` without a valid user"; `action` enum `project.created`, `task.created`, `task.updated`, `task.assigned`, `task.moved`, `comment.created`, `comment.updated`, `comment.deleted`, `request.refused`; `entity_type` enum nullable; `entity_id` nullable; `reason` enum `user_required` | `not_comment_author` | `validation_error` | `origin_not_allowed` nullable; `route` string(120) nullable "never the raw URL or body"; `changes` JSON text nullable "Always null for `request.refused`"; `request_id` string(64) nullable
- [X] T020 Create Alembic migration `backend/alembic/versions/0001_initial.py` for `users`, `projects`, `tasks`, `comments`, `audit_entries` with all constraints and indexes from T015–T019 (depends on T014–T019)
- [X] T021 Implement `backend/app/services/audit.py` (module docstring: owns `audit_entries`): `record_change(session, actor_id, action, entity_type, entity_id, changes, request_id)` in the caller's transaction, and `record_refusal(reason, route_template, actor_id, request_id)` in its own short transaction; never store submitted values (FR-023, research R14)
- [X] T022 Implement `backend/app/services/users.py` (`list_users` Product Manager first, `get_user`) and `require_user` in `backend/app/core/identity.py` reading `X-Taskify-User`; missing, malformed or unknown → `UserRequired` (FR-005, research R2)
- [X] T023 Implement `backend/app/core/errors.py`: domain errors `UserRequired` (401 `user_required`), `NotCommentAuthor` (403 `not_comment_author`), `NotFound` (404 `not_found`), `ProjectNameTaken` (409 `project_name_taken`); handlers returning `{"error": {"code", "message", "fields"?}, "request_id"}`; map `RequestValidationError` to 422 with one entry per field naming the field and rule (e.g., "Title is required. Enter 1 to 200 characters.") plus a short summary `message`; call `audit.record_refusal` for 401/403/422 with the route template; 500 returns a generic message and logs the exception (FR-020, FR-024)
- [X] T024 [P] Create `backend/app/schemas/common.py` (`StrictModel` with `extra="forbid"`, `ErrorEnvelope`) and `backend/app/schemas/user.py` (`UserOut { id, display_name, role, initials, avatar_color }`)
- [X] T025 Implement `ConnectionManager` in `backend/app/realtime/manager.py`: sockets grouped by user id, `broadcast(event)`, `send_to_user(user_id, event)`, ping/pong handling, close sockets silent for 60 s, open-socket metric (research R6)
- [X] T026 Implement `backend/app/schemas/events.py` (envelope `{type, event_id, occurred_at, actor_id, project_id, request_id, data}`, where `request_id` is the `X-Request-ID` of the REST request that caused the event, taken from the logging context; Constitution V, research R12) and `backend/app/services/events.py`: services queue events on the session and they are sent only after commit (broadcast or per user); discarded on rollback (contracts/websocket.md)
- [X] T027 Implement the WebSocket endpoint `GET /api/v1/ws?user=<id>` in `backend/app/routers/ws.py`: reject an `Origin` not in `CORS_ORIGINS` with close code 4403 (audited with reason `origin_not_allowed`) and an unknown user with 4401 (audited with reason `user_required`), both with route `WS /ws`, send `{"type":"hello","data":{"user_id":id}}`, answer `ping` with `pong`, ignore all other client messages
- [X] T028 [P] Implement `backend/app/routers/health.py`: `GET /api/v1/health` (`{"status":"ok","database":"ok"}`, 503 when the database is unreachable) and `GET /api/v1/metrics` (public)
- [X] T029 Implement idempotent seed in `backend/app/seed/sample_data.py` and `backend/app/seed/__main__.py`: users Alex Morgan (product_manager, `AM`, `#C4B5FD`), Sam Lee (`SL`, `#5EEAD4`), Jordan Patel (`JP`, `#F9A8D4`), Riley Chen (`RC`, `#FDBA74`), Taylor Brooks (`TB`, `#93C5FD`); project **Customer Portal** with at least 20 tasks, including the design's cards (To Do: "Add CSV export to reports" unassigned, "Write release notes" Taylor Brooks, "Investigate intermittent timeout when exporting large customer invoice histories to CSV for enterprise accounts" unassigned; In Progress: "Build account settings page" Sam Lee, "Fix date format on invoices" Riley Chen; In Review: "Update onboarding checklist copy" Alex Morgan, "Refactor search filters" Sam Lee; Done: "Set up error monitoring" Jordan Patel, "Accessibility audit for dashboard" Riley Chen), every user assigned at least two tasks and at least three unassigned; projects **Billing Revamp** and **Internal Tools** with at least eight tasks each across all four columns; comments on "Build account settings page" from Alex Morgan ("Please match the layout of the billing settings page.") and Riley Chen ("Time zone list is ready in the shared components."); runs only when `users` is empty; `python -m app.seed --perf` additionally creates a separate "Performance Board" project with 200 tasks for SC-007 checks (FR-006, SC-008, research R4)
- [X] T030 Implement the app factory in `backend/app/main.py` and the run entry point `backend/app/__main__.py` (`python -m app` starts Uvicorn on host `127.0.0.1`, port 8000, one worker, with no option to change the host; spec Security Considerations, research R13): routers under `/api/v1`, OpenAPI at `/api/v1/openapi.json` and docs at `/api/v1/docs`, CORS limited to `CORS_ORIGINS`, middleware, error handlers, lifespan that runs the seed
- [X] T031 [P] Implement `backend/app/scripts/export_openapi.py` writing `app.openapi()` to `frontend/src/app/core/api/openapi.json` (research R10)

### Backend foundation tests

- [X] T032 Create `backend/tests/conftest.py`: a separate temporary SQLite file per session migrated with `alembic upgrade head`, seeded data, `httpx.AsyncClient` with `ASGITransport`, and a `headers_for(user_name)` helper (research R11)
- [X] T033 [P] Unit tests for text rules in `backend/tests/unit/test_text.py`: "👨‍👩‍👧" counts as 1, a 200-emoji string passes a 200 limit and 201 fails, non-breaking spaces and tabs are trimmed, whitespace-only is empty, NFC normalisation is applied
- [X] T034 [P] Contract tests in `backend/tests/contract/test_errors_identity.py`: missing, malformed and unknown `X-Taskify-User` → 401 envelope with `request_id`; `X-Request-ID` echoed; an unexpected error → 500 with no stack trace; each refusal writes one `request.refused` audit row with `changes` null
- [X] T035 [P] Integration tests in `backend/tests/integration/test_ws_handshake.py`: disallowed Origin closes 4403, unknown user closes 4401 (both audited), valid handshake receives `hello`, unknown client messages are ignored

### Frontend foundation

- [ ] T036 [P] Create `frontend/src/styles/tokens.css` with CSS variables from `specs/001-taskify-kanban-board/design/tokens.md`: canvas `#0B1020`, accent `#5EEAD4`, text `#E6E9F2`/`#A3ACC2`, secondary accent `#A5B4FC`, status colors `#94A3B8` `#7DD3FC` `#FCD34D` `#86EFAC`, error `#FCA5A5`/`#F87171`, avatar colors, glass layers, shadows, radii (pill 9999px, lane 20px, card 16px, overlay 24px, input 12px), spacing (4/8/16/20/28/32px), type scale (Plus Jakarta Sans, `headline-xl` 32/40 … `label-sm` 11/14), notification tokens (`--tf-badge`, `--tf-unread-dot`, `--tf-panel-shadow`)
- [ ] T037 [P] Create `frontend/src/styles/glass.css` with `.glass-lane`, `.glass-card`, `.glass-subtle`, `.glass-overlay`, `.glass-panel-popover` (400px) and a `@supports not (backdrop-filter)` solid fallback; set lane glass so `--tf-text-2` text reaches 4.5:1 on the rendered background (FR-025)
- [ ] T038 [P] Create `frontend/src/styles/base.css` and `frontend/src/styles.css`: load Plus Jakarta Sans and Material Symbols Outlined (weight 300), body on `--tf-canvas`, 2px teal focus ring with 2px gap, `prefers-reduced-motion: reduce` disables tilt, shimmer and transitions, app shell `min-width: 1024px` (FR-025)
- [ ] T039 Configure `frontend/src/app/app.config.ts` (zoneless change detection, router, `HttpClient` with functional interceptors) and `frontend/src/app/app.component.ts` (aurora background, router outlet, toast region with `aria-live="polite"`)
- [ ] T040 [P] Implement `frontend/src/app/core/text/grapheme-length.ts`: NFC, `trim()`, grapheme count with `Intl.Segmenter(undefined, { granularity: "grapheme" })`, and Angular validators `requiredText(max)` / `optionalText(max)` matching the server; add `grapheme-length.spec.ts` with the emoji and whitespace cases from T033
- [ ] T041 Implement `frontend/src/app/core/identity/current-user.store.ts` (selected user in `sessionStorage`, `select`, `clear`, validate with `GET /users/me` on start and clear on 401, and a `userChanged` signal that every per-user store watches to reset itself, so "Switch user" never shows the previous user's data; FR-031), `user-header.interceptor.ts` (adds `X-Taskify-User`), and `user-selected.guard.ts` (redirects to `/select-user`) (FR-002, FR-005)
- [ ] T042 [P] Implement `frontend/src/app/core/http/request-id.interceptor.ts` (fresh `X-Request-ID` per request) and `frontend/src/app/core/http/api-error.interceptor.ts` (401 → clear selection and go to `/select-user`; 404 → "not found" toast and refresh signal; 500 → "Something went wrong. Try again.")
- [ ] T043 [P] Implement the toast in `frontend/src/app/shared/ui/toast/` (`toast.service.ts`, `toast.component.ts`): glass toast bottom right, amber edge variant for "not found", close button, auto-dismiss after 6 seconds, announced politely (design `not-found-toast`)
- [ ] T044 Implement `frontend/src/app/core/realtime/realtime.service.ts`: connect to `/api/v1/ws?user=<id>`, `status` signal `connected` | `reconnecting`, typed event stream, ping every 25 s, exponential backoff 1 s → 30 s, `reconnected` notification for stores, `disconnect()` for user switch (contracts/websocket.md)
- [ ] T045 [P] Implement shared UI in `frontend/src/app/shared/ui/`: `aurora-background/`, `glass-panel/`, `avatar/` (initials on color; dashed circle with person icon for Unassigned), `you-chip/`, `status-chip/` (dot + label per column), `skeleton/`, `empty-state/`, `connection-indicator/` ("Reconnecting…" pill bound to `RealtimeService.status`)
- [ ] T046 [P] Implement shared form UI in `frontend/src/app/shared/ui/`: `modal-shell/` (CDK Dialog, focus trap, focus returns to opener), `drawer-shell/`, `text-field/` (label, grapheme counter `n / max`, error message below naming the field and rule), `form-alert/` (summary banner)
- [ ] T047 Implement `frontend/src/app/shared/ui/top-nav/top-nav.component.ts` following the nav in `specs/001-taskify-kanban-board/design/screens/projects/screen.html`: wordmark linking to `/projects`, breadcrumb input, connection indicator, user chip (avatar, name, role), "Switch user" (disconnect the socket, call `CurrentUserStore.clear()` which fires `userChanged` so stores reset themselves, go to `/select-user`); a slot to the left of the user chip for the bell (filled in US5); no search, tabs, settings or filter
- [ ] T048 Define routes in `frontend/src/app/app.routes.ts` with a custom `TitleStrategy` in `frontend/src/app/core/title.strategy.ts` that sets the browser tab title as plain text ("Taskify", "Projects · Taskify", "<project name> · Taskify", "<task title> · <project name> · Taskify") through Angular's `Title` service, never via HTML (FR-021): `/select-user`; `/projects`, `/projects/:projectId` and child `tasks/:taskId` behind `userSelectedGuard`; `''` redirects to `/projects` (or `/select-user` via the guard)
- [X] T049 Add `frontend/ng-openapi-gen.json` (input `src/app/core/api/openapi.json`, output `src/app/core/api/generated/`), run `python -m app.scripts.export_openapi` and `npm run api:generate`, and commit both outputs

**Checkpoint**: Backend starts on 127.0.0.1, seeds data, answers `/health`; WebSocket handshake works;
frontend shell, tokens, identity guard and shared UI are in place.

---

## Phase 3: User Story 1 - Pick a user and work a project board (Priority: P1) 🎯 MVP

**Goal**: Pick one of five users, see projects, open a board, and move tasks between the four columns by
drag and drop or keyboard, with the user's own tasks highlighted and changes shown live.

**Independent Test**: Start with sample data, select Sam Lee, open Customer Portal, move a task from To
Do to In Progress, reload and confirm it stays; a second window updates within 2 s (quickstart
scenarios 1–6, 15, 32).

### Tests for User Story 1

- [X] T050 [P] [US1] Contract tests in `backend/tests/contract/test_board_api.py`: `GET /users` (public, five users, Product Manager first), `GET /users/me`, `GET /projects` (`ProjectSummary` with `counts` and `assigned_to_me`), `GET /projects/{id}`, `GET /projects/{id}/board` (four columns ordered by `position`), `POST /tasks/{id}/move` (`column` must be one of `todo`, `in_progress`, `in_review`, `done`; `position` integer ≥ 0, negatives → 422), unknown ids → 404, and no endpoint creates, edits or deletes users (`POST`/`PUT`/`PATCH`/`DELETE` on `/users` → 405) (FR-004)
- [X] T051 [P] [US1] Unit tests for placement in `backend/tests/unit/test_move.py`: position inserted and clamped "index clamped to 0..count", no position → bottom, same column and same index → no change and no audit entry, both columns renumbered gapless, `updated_at` changes on move
- [X] T052 [P] [US1] Integration test in `backend/tests/integration/test_us1_board.py`: move persists across requests, a second WebSocket client receives `task.moved` with the final `columns` order, an audit `task.moved` row is written, concurrent moves end in last-write-wins order

### Implementation for User Story 1

- [X] T053 [P] [US1] Create `backend/app/schemas/project.py` (`ProjectOut { id, name, description|null, created_at }`, `ProjectSummary` with `counts: {todo, in_progress, in_review, done}` and `assigned_to_me`) and in `backend/app/schemas/task.py` add `TaskOut { id, project_id, title, description|null, column, position, assignee: UserOut|null, created_at, updated_at, comment_count }`, `BoardOut`, and `MoveRequest { column: enum, position?: int ≥ 0 }`
- [X] T054 [US1] Implement `backend/app/routers/users.py`: `GET /api/v1/users` (public) and `GET /api/v1/users/me` (requires user)
- [X] T055 [US1] Implement `list_projects` (with per-column counts and `assigned_to_me` obtained by calling a `tasks` service function, not the Task model) and `get_project` in `backend/app/services/projects.py`; add `count_by_task(session, task_ids)` to `backend/app/services/comments.py` for `comment_count`
- [X] T056 [US1] Implement board composition and `move_task` in `backend/app/services/tasks.py` following data-model "Placement rules"; write `task.moved` audit with `{column: [old, new], position: [old, new]}`; queue a `task.moved` event with `from_column` and the final `columns` id lists; same column and same index returns the task unchanged with no audit or event
- [X] T057 [US1] Implement `GET /api/v1/projects`, `GET /api/v1/projects/{project_id}`, `GET /api/v1/projects/{project_id}/board` in `backend/app/routers/projects.py` and `POST /api/v1/tasks/{task_id}/move` in `backend/app/routers/tasks.py`; register routers in `backend/app/main.py`; re-export OpenAPI and regenerate the client (`frontend/src/app/core/api/`)
- [ ] T058 [P] [US1] Implement `frontend/src/app/features/user-select/user-select.page.ts` per `design/screens/user-select/`: "Who's working today?", five glass cards (avatar, name, role chip; Product Manager chip lavender), keyboard selectable, loading skeletons, error with "Try again"; selecting saves the user and goes to `/projects`; no password or sign-up
- [ ] T059 [P] [US1] Implement `frontend/src/app/core/state/projects.store.ts` and `frontend/src/app/features/projects/projects.page.ts` + `project-card/` per `design/screens/projects/`: title, "N projects", cards with name, two-line description, per-column count bar, "N assigned to you" badge, "Open board"; live updates from `project.created`, `task.created`, `task.moved`; reload on reconnect; reset on `userChanged` (the "assigned to you" badge belongs to the selected user); loading, empty and error states (FR-015, FR-032)
- [ ] T060 [US1] Implement `frontend/src/app/core/state/board.store.ts`: load board, optimistic move with rollback and toast on error, upsert by id from `task.created`/`task.updated`/`task.moved`, queue events while a drag is in progress and apply them after the move request completes, reload on reconnect, clear on `userChanged` (research R14, FR-031)
- [ ] T061 [US1] Implement `frontend/src/app/features/board/task-card/task-card.component.ts` per `design/screens/board/`: title clamped to two lines, assignee avatar and name or "Unassigned", accent edge plus "You" label when the assignee is the selected user, "Move to" button; nothing else on the card (no tags, ids, dates, flags, comment counts) (FR-014, FR-016)
- [ ] T062 [US1] Implement `frontend/src/app/features/board/board.page.ts` and `board-column/` with CDK `cdkDropListGroup`/`cdkDropList`/`cdkDrag`: four columns in fixed order with dot, glowing top line and count; dashed teal drop zone while dragging; loading branch with three skeleton cards per column (`design/screens/board-loading/`); horizontal scroll at 1024px (`variants/2`); unknown project → "not found" toast and go to `/projects`
- [ ] T063 [US1] Implement `frontend/src/app/features/board/move-menu/move-menu.component.ts` with CDK Menu per `design/screens/card-move-menu/`: four columns with status dots, current column checked and disabled, arrow keys and Enter, Escape returns focus to the card; calls move without `position` (FR-013, FR-025)
- [ ] T064 [P] [US1] Frontend unit tests: `frontend/src/app/core/identity/current-user.store.spec.ts` (persist, clear on 401), `frontend/src/app/core/state/board.store.spec.ts` (optimistic move, rollback, queued events during drag), `frontend/src/app/features/board/task-card/task-card.component.spec.ts` ("You" label only for the selected user)

**Checkpoint**: US1 is a working MVP on seeded data.

---

## Phase 4: User Story 2 - Create and assign tasks (Priority: P2)

**Goal**: Create tasks, edit title and description, assign, reassign or unassign, and change the column
from the task details.

**Independent Test**: Create "Write release notes" assigned to an engineer, see it at the bottom of To
Do, reassign it and clear the assignee; invalid titles are refused with a field message (quickstart
scenarios 7, 8, 29, 30).

### Tests for User Story 2

- [X] T065 [P] [US2] Contract and validation tests in `backend/tests/contract/test_tasks_api.py`: `POST /projects/{id}/tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`; title "1–200 characters" (empty, spaces only, 200 and 201 characters, 200 family emoji), description "≤ 5,000 characters", `assignee_id` unknown → 422, unknown fields → 422, markup stored as typed; each 422 writes a `request.refused` audit row without values
- [X] T066 [P] [US2] Integration test in `backend/tests/integration/test_us2_tasks.py`: new task at the bottom of To Do, assign/reassign/clear, audit rows `task.created`, `task.updated`, `task.assigned`, and `task.created`/`task.updated` events received by another socket

### Implementation for User Story 2

- [X] T067 [US2] Add `TaskCreate { title: RequiredText(200), description: OptionalText(5000), assignee_id: int | None }` and `TaskUpdate` (all optional; `assignee_id: null` clears) to `backend/app/schemas/task.py`
- [X] T068 [US2] Implement `create_task` (bottom of To Do: `position = count of todo tasks`) and `update_task` (title, description, assignee; validates the assignee via the `users` service) in `backend/app/services/tasks.py` with audit `task.created` / `task.updated` / `task.assigned` and `task.created` / `task.updated` events
- [X] T069 [US2] Implement `POST /api/v1/projects/{project_id}/tasks`, `GET /api/v1/tasks/{task_id}`, `PATCH /api/v1/tasks/{task_id}` in `backend/app/routers/tasks.py`; re-export OpenAPI and regenerate the client
- [ ] T070 [P] [US2] Implement `frontend/src/app/features/board/task-create/task-create.dialog.ts` per `design/screens/task-create/` and `task-create-error/`: "New task" with "Customer Portal · will be added to To Do", Title (required, `n / 200`), Description (`n / 5000`), Assignee select with "Unassigned" and five users; client checks with the grapheme validators; server 422 mapped to fields; field errors below fields plus summary banner; input kept
- [ ] T071 [US2] Implement the details part of `frontend/src/app/features/task-detail/task-detail.drawer.ts` per `design/screens/task-detail/`: route `/projects/:projectId/tasks/:taskId`, status chip, inline-editable title and description (`PATCH`), Status select (move without position), Assignee select incl. "Unassigned", created/updated dates; when `task.updated` arrives for a field with unsaved text, keep the text and show "<Actor> changed this task"; loading skeleton; 404 → toast and close; Escape closes and returns focus
- [ ] T072 [P] [US2] Frontend unit tests: `frontend/src/app/features/board/task-create/task-create.dialog.spec.ts` (counter counts emoji as one; whitespace-only title blocked; 422 field mapping) and `frontend/src/app/features/task-detail/task-detail.drawer.spec.ts` (edit-conflict notice keeps unsaved text)

**Checkpoint**: US1 and US2 work independently.

---

## Phase 5: User Story 3 - Comment on tasks (Priority: P3)

**Goal**: Read comments oldest first, add one, and edit or delete only one's own comments.

**Independent Test**: Add a comment as one engineer; as another user it is visible without Edit/Delete,
and an API attempt to change it returns 403 (quickstart scenarios 9–12, 31).

### Tests for User Story 3

- [X] T073 [P] [US3] Contract tests in `backend/tests/contract/test_comments_api.py`: list oldest first by `created_at` then `id`; body "1–2,000 characters" incl. emoji and whitespace-only; `PATCH`/`DELETE` by a non-author → 403 `not_comment_author` with an audit `request.refused` row; unknown ids → 404
- [X] T074 [P] [US3] Integration test in `backend/tests/integration/test_us3_comments.py`: `edited_at` set on edit, hard delete removes the comment for everyone, audit `comment.deleted` keeps the removed body, `comment.created`/`comment.updated`/`comment.deleted` events broadcast

### Implementation for User Story 3

- [X] T075 [US3] Create `backend/app/schemas/comment.py`: `CommentCreate { body: RequiredText(2000) }`, `CommentUpdate { body: RequiredText(2000) }`, `CommentOut { id, task_id, author: UserOut, body, created_at, edited_at|null }`
- [X] T076 [US3] Implement `list_comments`, `create_comment` (author from the selected user), `update_comment` and `delete_comment` (author only, no role exceptions; hard delete) in `backend/app/services/comments.py` with audit and `comment.*` events (FR-017 to FR-019)
- [X] T077 [US3] Implement `GET`/`POST /api/v1/tasks/{task_id}/comments` and `PATCH`/`DELETE /api/v1/comments/{comment_id}` in `backend/app/routers/comments.py`; register in `backend/app/main.py`; re-export OpenAPI and regenerate the client
- [ ] T078 [US3] Implement `frontend/src/app/core/state/comments.store.ts` (load per task, apply `comment.*` events, close an open editor and show "That comment no longer exists" when its comment is deleted; on a 403 `not_comment_author` from a stale view show the toast "You can only change your own comments." and reload the comments; discard drafts and loaded comments on `userChanged`)
- [ ] T079 [US3] Implement `frontend/src/app/features/task-detail/comment-list/`, `comment-item/` and `comment-composer/` and add a "Comments · N" heading to the drawer, per `design/screens/task-detail/` and `comment-edit/`: author avatar, name, time, "edited" marker; Edit (inline text area with `n / 2000`, Save/Cancel) and Delete (confirmation "Delete this comment? This can't be undone.", keyboard-operable, focus returns) only on own comments; markup shown as text; composer with counter and validation; "No comments yet"
- [ ] T080 [P] [US3] Frontend unit test `frontend/src/app/features/task-detail/comment-item/comment-item.component.spec.ts`: actions only for the author, confirmation required before delete, markup rendered as text

**Checkpoint**: US1–US3 work independently.

---

## Phase 6: User Story 4 - Create projects (Priority: P4)

**Goal**: Create a project with a unique name; it appears for everyone with an empty four-column board.

**Independent Test**: Create "Mobile App", see it for every user with an empty board; "mobile app" is
refused as a duplicate (quickstart scenario 13).

### Tests for User Story 4

- [X] T081 [P] [US4] Contract tests in `backend/tests/contract/test_projects_create.py`: name "1–100 characters, unique ignoring letter case" (`Customer Portal` vs `customer portal` → 409 `project_name_taken`), description "≤ 1,000 characters", whitespace-only name → 422, `project.created` event and audit row

### Implementation for User Story 4

- [X] T082 [US4] Add `ProjectCreate { name: RequiredText(100), description: OptionalText(1000) }` to `backend/app/schemas/project.py`, `create_project` (sets `name_key = casefold(trimmed name)`, raises `ProjectNameTaken` on conflict, audit `project.created`, event `project.created`) to `backend/app/services/projects.py`, and `POST /api/v1/projects` to `backend/app/routers/projects.py`; re-export OpenAPI and regenerate the client
- [ ] T083 [US4] Implement `frontend/src/app/features/projects/project-create/project-create.dialog.ts` per `design/screens/project-create/` and `project-create-error/`: Project name (`n / 100`), Description (`n / 1000`), preview of the four fixed columns; 409 shows "A project named "<name>" already exists. Choose a different name." under the field; 422 field errors from the envelope shown under each field with the summary banner, input kept; on 201 close and open the new board
- [ ] T084 [US4] Add the empty branch to `frontend/src/app/features/board/board.page.ts` per `design/screens/board-empty/`: four columns with count 0, To Do shows "No tasks yet" with "New task", other columns "Nothing here yet"

**Checkpoint**: US1–US4 work independently.

---

## Phase 7: User Story 5 - Notifications (Priority: P5)

**Goal**: Users are notified when someone else assigns, comments on or moves their task, via a bell and
panel that update live and stay private to the recipient.

**Independent Test**: As Alex, assign a task to Sam; Sam's bell count rises within 2 s without reload,
opening the notification lands on the task and marks it read (quickstart scenarios 19–27).

### Tests for User Story 5

- [X] T085 [P] [US5] Unit tests in `backend/tests/unit/test_notification_rules.py`: create with assignee notifies the assignee; assignee change notifies the new assignee; comment notifies the assignee; move to a different column notifies the assignee; never when recipient equals actor; never without an assignee; never for same-column reorder; `test_notification_retention` keeps exactly the newest 100 of 105
- [X] T086 [P] [US5] Contract tests in `backend/tests/contract/test_notifications_api.py`: `GET /notifications?limit=1..100` (default 100, newest first, `unread_count`), `POST /notifications/{id}/read` idempotent, `POST /notifications/read-all` → `{ "unread_count": 0 }`, another user's notification id → 404 `not_found`, no create/edit/delete endpoints exist
- [X] T087 [P] [US5] Integration test in `backend/tests/integration/test_us5_notifications.py`: only the recipient's socket receives `notification.created` with `unread_count`; `notifications.read` reaches the recipient's other socket; deleting a comment clears `comment_preview`; no audit rows for notification creation or reads

### Implementation for User Story 5

- [X] T088 [P] [US5] Create `Notification` model in `backend/app/models/notification.py`: `recipient_id` FK "never equals `actor_id`"; `actor_id` FK; `type` enum `task_assigned` | `task_commented` | `task_moved`; `project_id` FK; `task_id` FK; `task_title` text "Snapshot of the task title when created"; `to_column` enum nullable "Set only for `task_moved`"; `comment_id` integer nullable "not a foreign key"; `comment_preview` text nullable "First 140 characters of the comment (grapheme count); cleared when the comment is deleted"; `created_at`; `read_at` nullable; indexes `(recipient_id, created_at DESC, id DESC)` and `(recipient_id, read_at)`
- [X] T089 [US5] Create migration `backend/alembic/versions/0002_notifications.py` for the `notifications` table and indexes
- [X] T090 [US5] Create `backend/app/schemas/notification.py`: `NotificationOut { id, type, actor: UserOut, project: {id, name}, task_id, task_title, to_column|null, comment_preview|null, created_at, read: bool }`, `NotificationList { items, unread_count }`, `limit: int` 1–100 default 100
- [X] T091 [US5] Implement `backend/app/services/notifications.py` (module docstring: owns `notifications`): `notify(...)` applying data-model "Creation rules", trim the recipient to the newest 100 in the same transaction, `list_for_user`, `mark_read` (404 for others' ids), `mark_all_read`, `clear_comment_preview(comment_id)`; queue `notification.created` (recipient only) and `notifications.read` events
- [X] T092 [US5] Call `notifications.notify` from `create_task`, `update_task` (assignee change) and `move_task` (different column) in `backend/app/services/tasks.py`, and from `create_comment` plus `clear_comment_preview` from `delete_comment` in `backend/app/services/comments.py`, all inside the same transaction (research R7)
- [X] T093 [US5] Implement `GET /api/v1/notifications`, `POST /api/v1/notifications/{notification_id}/read`, `POST /api/v1/notifications/read-all` in `backend/app/routers/notifications.py`; register in `backend/app/main.py`; re-export OpenAPI and regenerate the client
- [ ] T094 [US5] Implement `frontend/src/app/core/state/notifications.store.ts`: load on user selection and after reconnect, unread count, badge text ("99+" above 99, hidden at 0), insert on `notification.created`, sync on `notifications.read`, reset immediately on user switch (FR-028 to FR-031)
- [ ] T095 [US5] Implement `frontend/src/app/shared/ui/top-nav/notification-bell/notification-bell.component.ts` in the top-nav slot: round glass button, teal badge, `aria-label="Notifications, N unread"`, `aria-expanded`
- [ ] T096 [US5] Implement `frontend/src/app/features/notifications/notification-panel/notification-panel.component.ts` and `notification-item/` per `design/screens/notifications-panel/` and `notifications-empty/`: 400px glass popover, "Notifications", "N unread" chip, "Mark all as read"; rows "<Actor> assigned you <task>", "<Actor> commented on <task>" + preview, "<Actor> moved <task> to <column>", then project and relative time, event icon, unread dot with a hidden "Unread" label; selecting marks read, closes and opens `/projects/:projectId/tasks/:taskId` (404 → toast); arrow-key navigation, Escape returns focus to the bell; loading skeleton; error with retry; empty "You're all caught up" with "Mark all as read" disabled; no pop-up toasts
- [ ] T097 [P] [US5] Frontend unit tests: `frontend/src/app/core/state/notifications.store.spec.ts` ("99+", reset on switch, read sync) and `frontend/src/app/features/notifications/notification-item/notification-item.component.spec.ts` (wording per type, preview omitted when cleared)

**Checkpoint**: All five stories work independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Gates and checks that span all stories.

- [X] T098 [P] Contract test `backend/tests/contract/test_openapi_drift.py`: committed `frontend/src/app/core/api/openapi.json` equals `app.openapi()`; add `npm run build` of the generated client to the checks (constitution Quality Gates, research R10)
- [X] T099 [P] Unit test `backend/tests/unit/test_domain_boundaries.py`: scan imports so each `backend/app/services/<domain>.py` imports only its own `backend/app/models/<domain>.py` and other domains' service modules (Constitution III)
- [X] T100 [P] Performance tests in `backend/tests/perf/test_performance.py` (marker `perf`): the "Performance Board" from `python -m app.seed --perf` (200 tasks), five WebSocket clients; board response < 3 s, move response < 1 s, event to other clients < 2 s, notification to recipient < 2 s (SC-003, SC-007, SC-009)
- [ ] T101 [P] Accessibility pass across all screens: keyboard-only walk-through, contrast measured on rendered glass, reduced motion, 1024px width; fix values in `frontend/src/styles/tokens.css` and `frontend/src/styles/glass.css` (FR-025, quickstart 18, 33, 34)
- [ ] T102 [P] Write decision records `docs/adr/0001-modular-monolith.md`, `0002-identity-without-login.md`, `0003-task-ordering.md`, `0004-websocket-events-and-notifications.md`, `0005-grapheme-length-and-text-columns.md` from research R1, R2, R5, R6/R7, R14 (Constitution IV)
- [ ] T103 [P] Add `scripts/check.ps1` running `ruff check` (incl. docstring rules), `pytest`, `ng test --watch=false`, `ng lint` (incl. TSDoc rule), `npm run build`, `pip-audit -r backend/requirements.txt`, `npm audit --audit-level=high` and the OpenAPI drift test, exiting non-zero on any failure; document in both READMEs that it MUST pass before every merge until CI runs (plan Complexity Tracking)
- [ ] T104 [P] Add `.github/workflows/ci.yml` running the same gates as `scripts/check.ps1` on push and pull request (Python 3.12 and Node 24 from `.python-version` and `.nvmrc`); it takes effect once a remote is added, after which the CI row in plan Complexity Tracking is removed (Constitution Quality Gates)
- [ ] T105 [P] Browser timing check for SC-007 per quickstart scenario 38: open the "Performance Board" with DevTools Performance and record that all four columns paint in under 3 s and a dropped card shows in under 1 s; fix rendering (e.g., `@for` with `track task.id`, avoiding per-card heavy effects) in `frontend/src/app/features/board/` if not met
- [ ] T106 Run every scenario in `specs/001-taskify-kanban-board/quickstart.md` (1–38, including the usability walkthrough 37 for SC-001, SC-002 and SC-008) and fix any failure before marking the feature done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories
- **User stories (Phases 3–7)**: each depends only on Foundational; deliver in priority order P1 → P5
- **Polish (Phase 8)**: after the desired stories are complete

### User Story Dependencies

- **US1 (P1)**: Foundational only; uses seeded data
- **US2 (P2)**: Foundational only; its task drawer route sits under the US1 board but the API and dialog
  are testable alone
- **US3 (P3)**: Foundational only for the API; its UI lives in the US2 task drawer (build after T071)
- **US4 (P4)**: Foundational only; the empty-board branch (T084) edits the US1 board page
- **US5 (P5)**: Foundational only for its own model and API; T092 hooks into services from US1–US3
  (`move_task`, `create_task`, `update_task`, `create_comment`, `delete_comment`), so implement T092
  after those exist

### Within Each Story

- Tests first and failing → schemas/models → services → routers → OpenAPI export and client
  regeneration → stores → components
- Every task that changes an endpoint ends with re-exporting OpenAPI and regenerating the client

### Parallel Opportunities

- Setup: T004–T007 in parallel after T001–T003
- Foundational: models T015–T019; T010–T012; frontend T036–T038, T040, T042, T043, T045, T046 in
  parallel with backend work
- Each story: its test tasks in parallel; backend and frontend halves in parallel once the
  regenerated client exists
- Polish: T098–T105 in parallel; T106 last

---

## Parallel Example: User Story 1

```text
# Tests together:
Task: "T050 Contract tests in backend/tests/contract/test_board_api.py"
Task: "T051 Unit tests for placement in backend/tests/unit/test_move.py"
Task: "T052 Integration test in backend/tests/integration/test_us1_board.py"

# After T057 regenerates the client, frontend pages together:
Task: "T058 user-select page in frontend/src/app/features/user-select/"
Task: "T059 projects store and page in frontend/src/app/features/projects/"
```

## Parallel Example: User Story 5

```text
Task: "T085 Unit tests in backend/tests/unit/test_notification_rules.py"
Task: "T086 Contract tests in backend/tests/contract/test_notifications_api.py"
Task: "T087 Integration test in backend/tests/integration/test_us5_notifications.py"
Task: "T088 Notification model in backend/app/models/notification.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1)
3. **Stop and validate** with quickstart scenarios 1–6, 15 and 32
4. Demo: pick a user, browse projects, move tasks with live updates

### Incremental Delivery

1. Foundation ready
2. + US1 → MVP demo
3. + US2 → create and assign tasks
4. + US3 → comments
5. + US4 → new projects
6. + US5 → notifications
7. Polish → all quickstart scenarios pass

---

## Notes

- [P] tasks touch different files and have no dependency on unfinished tasks
- The Stitch HTML in `design/screens/` is a visual reference only; rebuild with Angular components and
  `tokens.css`, and never build the elements listed as out of scope in `design/tokens.md`
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own
