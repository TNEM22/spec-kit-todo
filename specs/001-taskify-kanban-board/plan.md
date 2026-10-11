# Implementation Plan: Taskify Kanban Board

**Branch**: `001-taskify-kanban-board` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-taskify-kanban-board/spec.md`

## Summary

Taskify phase 1 is a local web app where one of five predefined users (no login) picks an identity,
browses projects, and moves tasks across a fixed four-column Kanban board, with task creation,
assignment, author-only comments, and in-app notifications when someone else assigns, comments on
or moves your task. The backend is a FastAPI modular monolith over SQLite (async SQLAlchemy,
Alembic, WAL) exposing a versioned REST API at `/api/v1` plus one WebSocket that pushes every
change to open boards and each notification to its recipient only. The frontend is an Angular 21 standalone, signal-based app using CDK
DragDrop, a client generated from the OpenAPI schema, and the dark "fluid glass" design imported
from Google Stitch.

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript with Angular 21 (frontend)

**Primary Dependencies**: FastAPI, Uvicorn, Pydantic v2, pydantic-settings, SQLAlchemy 2.x (async),
aiosqlite, Alembic; Angular 21 (standalone, signals, zoneless), Angular CDK (DragDrop, Menu,
Dialog), ng-openapi-gen

**Storage**: SQLite file (`backend/taskify.db`) in WAL mode via `DATABASE_URL`; ORM-only access so
PostgreSQL can replace it by changing the URL (research R3)

**Testing**: pytest, pytest-asyncio, httpx `AsyncClient` with a separate temp SQLite database;
Angular's default unit test runner (Vitest via `ng test`)

**Target Platform**: Local desktop machine (Windows, macOS, Linux); API on `127.0.0.1:8000`,
Angular dev server on `localhost:4200`; desktop browsers

**Project Type**: Web application (backend API + frontend SPA)

**Performance Goals**: board with 200 tasks loads < 3 s; a move shows in its new position < 1 s for
the mover and < 2 s on other open boards; a notification reaches its online recipient < 2 s
(SC-003, SC-007, SC-009)

**Constraints**: no Docker; single Uvicorn worker (in-process WebSocket broadcast); bound to
localhost; WCAG 2.1 AA; no authentication in this phase

**Scale/Scope**: 5 users, 3 seeded projects plus user-created ones, up to ~200 tasks per project,
up to 100 notifications per user; 15 designed screens/states; ~18 REST endpoints and 1 WebSocket

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 ([.specify/memory/constitution.md](../../.specify/memory/constitution.md)).

| Principle / Rule | Status | How the plan complies |
|------------------|--------|-----------------------|
| I. Security-First: security section in spec | ✅ Pass | Spec has Security Considerations; this plan adds research R2, R6, R8, R13 |
| I. Least privilege | ✅ Pass | No privileged accounts or secrets; DB file is local; WebSocket is read-only for clients |
| I. Deny by default | ✅ Pass | `require_user` dependency on every route except `GET /users` and `GET /health`, `/metrics` (declared public) |
| I. No secrets in code/logs | ✅ Pass | Settings via `.env` (git-ignored) + `.env.example`; logs exclude bodies and comment text |
| I. Dependency vulnerabilities | ✅ Pass | Pinned deps; `pip-audit` and `npm audit` in checks (quickstart §3) |
| I. Authentication | ⚠️ Deviation | No login in phase 1, by spec decision; see Complexity Tracking |
| II. Validate all inputs server-side, schema, allow-list | ✅ Pass | Pydantic `extra="forbid"`, length limits, enums, trimming (data-model Validation summary) |
| II. Reject, don't coerce; non-leaking errors | ✅ Pass | One error envelope; 422 with field messages; 500 generic (research R8) |
| II. Output encoding, parameterized queries | ✅ Pass | Angular interpolation only, `innerHTML` banned by lint; ORM only, no raw SQL |
| II. Validation tests with malicious input | ✅ Pass | Planned per field (research R11) |
| III. Each service owns its data; versioned contracts | ⚠️ Deviation | Modular monolith (now also a spec clarification) with per-domain table ownership, including the new `notifications` domain; REST contract versioned `/api/v1`; see Complexity Tracking |
| I/II. Notification privacy and input | ✅ Pass | Every notification query filters by the selected user; others' ids return 404; notification text rendered as plain text (research R7) |
| III. Inter-service calls authenticated | N/A | No inter-service network calls in a single process |
| IV. Public code documented | ✅ Pass | Docstrings on public functions, routers and schemas; TSDoc on exported Angular APIs; enforced in review |
| IV. README per service, machine-readable contract | ✅ Pass | `backend/README.md`, `frontend/README.md`; OpenAPI generated and committed with drift test |
| IV. Decision records | ✅ Pass | `research.md` here, copied to `docs/adr/` during implementation for lasting decisions |
| V. Structured logs with correlation id | ✅ Pass | JSON logs, `X-Request-ID` middleware (research R12) |
| V. Audit log of security-relevant events | ✅ Pass | `audit_entries` written in-transaction (FR-023) |
| V. Health checks and metrics | ✅ Pass | `/api/v1/health`, `/api/v1/metrics` |
| Security Req.: central auth mechanism | ⚠️ Deviation | Covered by the authentication deviation |
| Security Req.: TLS in transit | ⚠️ Deviation | Localhost-only HTTP; see Complexity Tracking |
| Security Req.: rate limiting public endpoints | ⚠️ Deviation | Not exposed publicly; see Complexity Tracking |
| Security Req.: hashed passwords | N/A | No passwords stored |
| Security Req.: no stack traces in errors | ✅ Pass | Global exception handler |
| Workflow: CI gates, contract tests both sides | ✅ Pass | pytest, `ng test`, `ng lint`, OpenAPI drift test, audits (quickstart §3) |

**Gate result (pre-research)**: PASS with justified deviations listed in Complexity Tracking.

**Gate result (post-design re-check)**: PASS. The data model, contracts and UI plan introduce no new
deviations. Items tightened during design: the WebSocket handshake checks `Origin` and the user id,
notification events are delivered only to the recipient's sockets (contracts/websocket.md),
notifications are written in the same transaction as their triggering change so none are lost
(research R7), and seed data was kept out of migrations so PostgreSQL migration stays clean
(research R4).

**Plan revision 2026-10-11**: updated for the spec clarifications that added notifications (US5,
FR-026 to FR-031), made live updates a requirement (FR-015), and recorded the monolith decision.

## Project Structure

### Documentation (this feature)

```text
specs/001-taskify-kanban-board/
├── plan.md                  # This file (/speckit-plan output)
├── research.md              # Phase 0 output
├── data-model.md            # Phase 1 output
├── quickstart.md            # Phase 1 output
├── contracts/               # Phase 1 output
│   ├── rest-api.md          #   REST endpoints, error envelope
│   ├── websocket.md         #   real-time events
│   └── ui-screens.md        #   per-screen UI contracts
├── design-prompt.md         # Google Stitch prompts (/speckit-design-plan)
├── design/                  # Imported Stitch designs (/speckit-design-import)
│   ├── manifest.md          #   screen status tracking
│   ├── tokens.md            #   extracted design tokens
│   ├── screens/<slug>/      #   screen.html + screen.png per screen
│   └── imports/             #   raw extracted zip (reference only)
├── checklists/requirements.md
└── tasks.md                 # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── README.md
├── pyproject.toml                 # pytest, ruff, mypy config
├── requirements.txt               # pinned runtime deps
├── requirements-dev.txt           # + test and audit tools
├── .env.example                   # DATABASE_URL, CORS_ORIGINS, LOG_LEVEL
├── alembic.ini
├── alembic/
│   ├── env.py                     # async template, render_as_batch=True
│   └── versions/
├── app/
│   ├── main.py                    # app factory, routers, middleware, lifespan (seed)
│   ├── core/
│   │   ├── config.py              # pydantic-settings Settings
│   │   ├── db.py                  # async engine, session, SQLite PRAGMAs, UTCDateTime
│   │   ├── identity.py            # require_user dependency (X-Taskify-User)
│   │   ├── errors.py              # domain errors + error envelope handlers
│   │   ├── logging.py             # JSON formatter, request-id context
│   │   ├── middleware.py          # request id, security headers, metrics
│   │   └── metrics.py             # in-process counters
│   ├── models/                    # SQLAlchemy models, one module per owning domain
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── comment.py
│   │   ├── notification.py
│   │   └── audit.py
│   ├── schemas/                   # Pydantic request/response models
│   │   ├── common.py              # error envelope, base config (extra="forbid")
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── comment.py
│   │   ├── notification.py
│   │   └── events.py              # WebSocket event envelopes
│   ├── services/                  # domain logic; each touches only its own models
│   │   ├── users.py
│   │   ├── projects.py
│   │   ├── tasks.py               # create, update, move/renumber, board composition
│   │   ├── comments.py            # author-only edit/delete
│   │   ├── notifications.py       # trigger rules, 100-per-user trim, list, mark read
│   │   ├── audit.py
│   │   └── events.py              # publish-after-commit to realtime (broadcast or per user)
│   ├── routers/                   # /api/v1 routes
│   │   ├── health.py
│   │   ├── users.py
│   │   ├── projects.py
│   │   ├── tasks.py
│   │   ├── comments.py
│   │   ├── notifications.py
│   │   └── ws.py                  # WebSocket endpoint
│   ├── realtime/
│   │   └── manager.py             # ConnectionManager: sockets by user, broadcast, send_to_user, heartbeat
│   ├── seed/
│   │   ├── __main__.py            # python -m app.seed
│   │   └── sample_data.py         # 5 users, 3 projects, sample tasks/comments
│   └── scripts/
│       └── export_openapi.py      # writes frontend/src/app/core/api/openapi.json
└── tests/
    ├── conftest.py                # temp SQLite DB, alembic upgrade, AsyncClient
    ├── contract/                  # endpoint shapes, error envelope, OpenAPI drift
    ├── integration/               # flows per user story, WebSocket, audit
    ├── unit/                      # move/renumber, validation, name_key
    └── perf/                      # 200-task board (pytest -m perf)

frontend/
├── README.md
├── angular.json
├── package.json                   # scripts: start, test, lint, api:generate
├── ng-openapi-gen.json
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css                 # imports styles/*
    ├── styles/
    │   ├── tokens.css             # CSS custom properties from design/tokens.md
    │   ├── glass.css              # glass surface utility classes
    │   └── base.css               # font, focus ring, reduced motion, typography scale
    └── app/
        ├── app.config.ts          # zoneless, router, HttpClient + interceptors
        ├── app.routes.ts
        ├── app.component.ts       # aurora background + router outlet + toast region
        ├── core/
        │   ├── api/
        │   │   ├── openapi.json   # exported from backend (committed)
        │   │   └── generated/     # ng-openapi-gen output (do not edit)
        │   ├── identity/
        │   │   ├── current-user.store.ts
        │   │   ├── user-header.interceptor.ts
        │   │   └── user-selected.guard.ts
        │   ├── http/
        │   │   ├── request-id.interceptor.ts
        │   │   └── api-error.interceptor.ts   # 401 → select user, 404/500 → toast
        │   ├── realtime/
        │   │   └── realtime.service.ts
        │   └── state/
        │       ├── projects.store.ts
        │       ├── board.store.ts
        │       ├── comments.store.ts
        │       └── notifications.store.ts
        ├── shared/ui/
        │   ├── aurora-background/
        │   ├── top-nav/
        │   │   └── notification-bell/ # bell button + unread badge, opens the panel
        │   ├── avatar/
        │   ├── you-chip/
        │   ├── status-chip/
        │   ├── glass-panel/
        │   ├── modal-shell/
        │   ├── drawer-shell/
        │   ├── text-field/        # label, counter, error message
        │   ├── form-alert/
        │   ├── skeleton/
        │   ├── empty-state/
        │   └── toast/             # toast.component + toast.service
        └── features/
            ├── user-select/
            │   └── user-select.page.ts
            ├── projects/
            │   ├── projects.page.ts
            │   ├── project-card/
            │   └── project-create/project-create.dialog.ts
            ├── board/
            │   ├── board.page.ts
            │   ├── board-column/
            │   ├── task-card/
            │   ├── move-menu/
            │   └── task-create/task-create.dialog.ts
            ├── task-detail/
            │   ├── task-detail.drawer.ts
            │   ├── comment-list/
            │   ├── comment-item/
            │   └── comment-composer/
            └── notifications/
                ├── notification-panel/notification-panel.component.ts
                └── notification-item/

docs/
└── adr/                           # decision records carried over from research.md
```

**Structure Decision**: Web application with `backend/` (FastAPI) and `frontend/` (Angular), as the
user specified. Inside `backend/app`, the user's layer folders (`models`, `schemas`, `routers`,
`services`) hold one module per domain, and the domain ownership rule from research R1 keeps them
separable. Frontend unit tests live next to their components (`*.spec.ts`), following Angular
defaults.

## UI Design Implementation

**Design source**: [design/manifest.md](design/manifest.md), [design/tokens.md](design/tokens.md),
[design-prompt.md](design-prompt.md). Status check: no `frontend/` code exists yet, so all 15
`generated` designs are unimplemented and none were marked `implemented`.

### Design tokens plan (shared setup, done once)

- `frontend/src/styles/tokens.css`: every value from `design/tokens.md` as CSS custom properties on
  `:root`, grouped as colors (`--tf-canvas`, `--tf-accent`, `--tf-text`, `--tf-text-2`,
  `--tf-status-todo|in-progress|in-review|done`, `--tf-error`, `--tf-avatar-*`), glass layers
  (`--tf-glass-lane|card|subtle|overlay|hover` fill, border, blur), shadows, radii (pill 9999px,
  lane 20px, card 16px, overlay 24px, input 12px), spacing (4/8/16/20/28/32px), and the type scale
  (Plus Jakarta Sans, sizes from `headline-xl` to `label-sm`). The Stitch Material-style theme
  tokens are not carried over (tokens.md "Differences").
- `frontend/src/styles/glass.css`: `.glass-lane`, `.glass-card`, `.glass-overlay`, `.glass-subtle`
  classes using those variables, with a `@supports not (backdrop-filter)` fallback to solid
  `--tf-surface` colors.
- `frontend/src/styles/base.css`: font loading, body on `--tf-canvas`, global focus ring (2px teal
  with 2px gap), `prefers-reduced-motion` disables drag tilt and shimmer.
- Contrast: columns use `white/0.04` in the export; raise text-bearing lanes to at least the value
  that keeps `--tf-text-2` at 4.5:1 and verify with an accessibility checker (FR-025).
- Icons: Material Symbols Outlined (weight 300), as in the export.
- Notification tokens (tokens.md "Notifications"): `--tf-badge` (teal fill, dark text, glow),
  `--tf-unread-dot`, `--tf-panel-shadow` (heavier overlay shadow with faint teal glow), and a
  `.glass-panel-popover` class at 400px width (`calc(100vw - 1.5rem)` on narrow windows).
- Navigation bar reference: the nav in `design/screens/projects/screen.html` (wordmark,
  breadcrumb, bell, user chip, "Switch user"); other exports still show the out-of-scope search
  and tabs.

### Shared components

| Component | Path | Used by |
|-----------|------|---------|
| Aurora background | `frontend/src/app/shared/ui/aurora-background/` | All screens |
| Top navigation bar | `frontend/src/app/shared/ui/top-nav/` | projects, board, board-*, task-*, comment-edit, not-found-toast, project-create* |
| Avatar (initials, color, unassigned) | `frontend/src/app/shared/ui/avatar/` | user-select, projects, board, task-create, task-detail, comment-edit |
| "You" chip | `frontend/src/app/shared/ui/you-chip/` | board, card-move-menu, task-detail |
| Status chip / column dot | `frontend/src/app/shared/ui/status-chip/` | board, card-move-menu, task-detail, project-create |
| Glass panel | `frontend/src/app/shared/ui/glass-panel/` | All screens |
| Modal shell (CDK Dialog, focus trap) | `frontend/src/app/shared/ui/modal-shell/` | task-create, task-create-error, project-create, project-create-error |
| Drawer shell | `frontend/src/app/shared/ui/drawer-shell/` | task-detail, comment-edit, not-found-toast |
| Text field with label, counter, error | `frontend/src/app/shared/ui/text-field/` | task-create*, project-create*, task-detail, comment-edit |
| Form alert banner | `frontend/src/app/shared/ui/form-alert/` | task-create-error, project-create-error |
| Skeleton | `frontend/src/app/shared/ui/skeleton/` | board-loading, user-select, projects, task-detail |
| Empty state | `frontend/src/app/shared/ui/empty-state/` | board-empty, projects, task-detail |
| Toast + service | `frontend/src/app/shared/ui/toast/` | not-found-toast, all API errors |
| Task card | `frontend/src/app/features/board/task-card/` | board, board-loading, card-move-menu, not-found-toast |
| Notification bell + badge | `frontend/src/app/shared/ui/top-nav/notification-bell/` | Every screen with the top navigation bar; opens notifications-panel / notifications-empty |

### Screen implementation table

| Slug | Screen | User Story | Design Reference | Frontend Target (page/component paths) | Shared Components Used | States to Build | Data/Contract Dependencies |
|------|--------|------------|------------------|----------------------------------------|------------------------|-----------------|----------------------------|
| board | Project board | US1 (P1) | `design/screens/board/screen.html`, `screen.png`, `variants/1`–`3` | `features/board/board.page.ts`, `board-column/`, `task-card/` | top-nav, glass-panel, avatar, you-chip, status-chip, task-card | default, mid-drag + drop zone, my-task highlight, long-title clamp, 1024px scroll, project not found | Project, Task, User; `GET /projects/{id}/board`, `POST /tasks/{id}/move`; `task.*` events |
| user-select | User selection | US1 (P1) | `design/screens/user-select/screen.html`, `screen.png` | `features/user-select/user-select.page.ts` | aurora-background, glass-panel, avatar, skeleton | loading, error + retry, focus/hover | User; `GET /users`, `GET /users/me` |
| projects | Project list | US1 (P1), US4 (P4) | `design/screens/projects/screen.html` (image empty; nav reference), `variants/1` | `features/projects/projects.page.ts`, `project-card/` | top-nav, glass-panel, avatar, skeleton, empty-state | loading, empty, error, hover | Project (summary counts); `GET /projects`; `project.created`, `task.*` events |
| task-create | New task modal | US2 (P2) | `design/screens/task-create/screen.html`, `screen.png` | `features/board/task-create/task-create.dialog.ts` | modal-shell, text-field, avatar | idle, submitting, assignee dropdown open | Task, User; `POST /projects/{id}/tasks`, `GET /users` |
| task-create-error | New task validation error | US2 (P2) | `design/screens/task-create-error/screen.html`, `screen.png` | `features/board/task-create/task-create.dialog.ts` | modal-shell, text-field, form-alert | empty/whitespace title, over-length fields, server 422 | Error envelope (contracts/rest-api.md) |
| task-detail | Task detail drawer | US2 (P2), US3 (P3) | `design/screens/task-detail/screen.html`, `screen.png` | `features/task-detail/task-detail.drawer.ts`, `comment-list/`, `comment-item/`, `comment-composer/` | drawer-shell, avatar, you-chip, status-chip, text-field, skeleton, empty-state | loading, no comments, composer error, inline edit, task not found | Task, Comment, User; `GET/PATCH /tasks/{id}`, `POST /tasks/{id}/move`, `GET/POST /tasks/{id}/comments`; `task.*`, `comment.*` events |
| comment-edit | Editing my own comment | US3 (P3) | `design/screens/comment-edit/screen.html`, `screen.png` | `features/task-detail/comment-item/` | text-field, avatar | edit mode, delete confirmation, others' comments without actions, markup as text, 403 | Comment; `PATCH /comments/{id}`, `DELETE /comments/{id}` |
| not-found-toast | Not found message | US1 (P1), US3 (P3) | `design/screens/not-found-toast/screen.html`, `screen.png` | `shared/ui/toast/`, `core/http/api-error.interceptor.ts` | toast | 404 from actions, deleted comment event, stale link | Error envelope; `comment.deleted` event |
| board-loading | Board loading | US1 (P1) | `design/screens/board-loading/screen.html`, `screen.png` | `features/board/board.page.ts` (loading branch) | skeleton, glass-panel, top-nav | loading | `GET /projects/{id}/board` pending |
| card-move-menu | Keyboard "Move to" menu | US1 (P1) | `design/screens/card-move-menu/screen.html`, `screen.png` | `features/board/move-menu/` | status-chip, task-card | open, current column disabled, keyboard navigation | `POST /tasks/{id}/move` (no position) |
| project-create | New project modal | US4 (P4) | `design/screens/project-create/screen.html`, `screen.png` | `features/projects/project-create/project-create.dialog.ts` | modal-shell, text-field, status-chip | idle, submitting | Project; `POST /projects` |
| project-create-error | New project duplicate name | US4 (P4) | `design/screens/project-create-error/screen.html`, `screen.png` | `features/projects/project-create/project-create.dialog.ts` | modal-shell, text-field, form-alert | 409 duplicate, 422 fields | Error envelope |
| board-empty | Empty board | US4 (P4) | `design/screens/board-empty/screen.html` (image empty) | `features/board/board.page.ts` (empty branch) | empty-state, glass-panel, top-nav | empty | `GET /projects/{id}/board` with no tasks |
| notifications-panel | Notification panel | US5 (P5) | `design/screens/notifications-panel/screen.html`, `screen.png` | `features/notifications/notification-panel/notification-panel.component.ts`, `features/notifications/notification-item/`, `shared/ui/top-nav/notification-bell/` | top-nav, notification-bell, avatar, status-chip, glass-panel, skeleton | unread/read rows, badge count incl. "99+", live insert, loading, error + retry, 404 on open | Notification, User, Project; `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`; `notification.created`, `notifications.read` events |
| notifications-empty | No notifications | US5 (P5) | `design/screens/notifications-empty/screen.html`, `screen.png` | `features/notifications/notification-panel/` (empty branch) | empty-state, notification-bell | empty, "Mark all as read" disabled, no badge | `GET /notifications` returning no items |

Paths in the table are relative to `frontend/src/app/`.

### Already implemented

None.

### Pending designs

None. All 15 manifest rows are `generated`.

### Implementation rules

- The Stitch HTML is a visual reference, not production code. Rebuild each screen with Angular
  standalone components and the shared components above; do not copy its Tailwind markup.
- Use the CSS variables from `styles/tokens.css`; no hard-coded colors, radii or shadows in
  component styles.
- Keep accessibility at least as good as the design: AA contrast, keyboard access for every action,
  labelled fields, focus management in dialogs and drawer, and the "You" chip so highlighting never
  relies on color alone.
- Match layout regions and states from each screenshot, but leave out everything listed under
  "Out-of-scope elements" in `design/tokens.md`.
- The UI contract for each screen is in [contracts/ui-screens.md](contracts/ui-screens.md).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No authentication (Principle I; Security Req. central auth) | Spec phase 1 decision: predefined users, no login; identity choice only | Adding login contradicts the spec scope. Mitigated by deny-by-default `X-Taskify-User` check, audit log, localhost-only binding |
| Modular monolith instead of microservices (Principle III) | User-specified single FastAPI backend, local install, no Docker; confirmed in the spec clarifications | Separate services would need process orchestration and inter-service auth with no benefit at 5 users; per-domain table ownership keeps later extraction possible (research R1). Remove this row once Principle III is amended via `/speckit-constitution` |
| No TLS (Security Req.) | Server bound to 127.0.0.1 for local development only | Local certificates add setup cost with no attacker on the loopback interface; required before any network exposure |
| No rate limiting (Security Req.) | No public endpoints; localhost only | A limiter protects nothing locally; must be added together with authentication before exposure |

## Out of Scope for This Plan

- Email or push notifications, notification settings, pop-up notification toasts, deleting
  notifications (spec Assumptions; in-app notifications are planned, research R7).
- Project and task deletion, user management, audit log screen, presence indicators, mobile layouts
  (spec Assumptions).
