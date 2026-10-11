# Research: Taskify Kanban Board

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-11

Each entry records a decision, why it was chosen, and what else was considered. The stack itself
(FastAPI, SQLAlchemy async + SQLite, Alembic, Angular 21, CDK DragDrop, WebSocket) was given by the
user; the entries below resolve how to use it and the gaps the input left open.

## R1. Service architecture vs. Constitution Principle III

- **Decision**: One FastAPI process structured as a **modular monolith**. Domains (`users`,
  `projects`, `tasks`, `comments`, `audit`, `realtime`) each own their tables, schemas and service
  module. A service may read or write only its own tables; other domains are reached through their
  service functions, never their models. The board view is composed in the `tasks` service by
  calling the `projects` and `users` services.
- **Rationale**: The user asked for a single `/backend` app, local install, no Docker, single-user
  development. Separate deployables would add process management, network contracts and
  cross-service auth with no benefit at this scale. Strict module ownership keeps each domain
  extractable into its own service later, which is the intent of Principle III.
- **Alternatives considered**: Separate FastAPI services per domain with an API gateway (rejected:
  needs process orchestration and inter-service auth the phase does not have); unstructured monolith
  (rejected: would make later extraction costly and violates the spirit of III).
- **Constitution impact**: Recorded as a justified deviation in plan.md Complexity Tracking.

## R2. Identity without login (FR-002, FR-005, clarification on session persistence)

- **Decision**: The frontend stores the selected user id in `sessionStorage` (cleared when the tab or
  window closes, kept across reloads). Every REST request sends header `X-Taskify-User: <user id>`
  via an Angular HTTP interceptor; the WebSocket sends it as the `user` query parameter on connect.
  A FastAPI dependency `require_user` loads the user and rejects missing or unknown ids with
  `401 user_required`. Only `GET /api/v1/users` and `GET /api/v1/health` are public.
- **Rationale**: Matches the clarified behavior (persist across reloads, clear on close), keeps the
  server deny-by-default (Principle I) and gives every audit entry an actor. It is explicitly an
  identity choice, not authentication, as the spec states.
- **Alternatives considered**: Cookie session (rejected: implies authentication and adds CSRF
  handling for no gain); `localStorage` (rejected: survives browser restarts, contradicting the
  clarification); user id in the URL path (rejected: leaks into links and history).

## R3. SQLite with async SQLAlchemy and a path to PostgreSQL

- **Decision**: SQLAlchemy 2.x async engine with `aiosqlite`, URL from `DATABASE_URL`
  (default `sqlite+aiosqlite:///./taskify.db`). On every new connection set
  `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, `PRAGMA busy_timeout=5000`, and
  `PRAGMA synchronous=NORMAL` via a `connect` event listener, applied only when the dialect is
  SQLite. All data access goes through ORM models and `select()`/`update()` constructs; no raw SQL
  and no SQLite-only functions.
- **Rationale**: WAL lets the WebSocket broadcaster and API readers run while a write is in
  progress; `busy_timeout` avoids immediate "database is locked" errors; foreign keys are off by
  default in SQLite. ORM-only access satisfies the PostgreSQL migration goal.
- **Portability rules**: timezone-aware UTC timestamps through a `UTCDateTime` type decorator
  (SQLite drops tz info); case-insensitive project name uniqueness through a stored
  `name_key` column (`casefold()` of the trimmed name) with a unique index instead of
  `COLLATE NOCASE`; enums stored as short strings with a check constraint.
- **Alternatives considered**: Sync SQLAlchemy in a thread pool (rejected: user asked for async);
  `COLLATE NOCASE` (rejected: SQLite-specific).

## R4. Migrations and seed data

- **Decision**: Alembic initialised with the async template; `render_as_batch=True` so SQLite
  `ALTER TABLE` limitations are handled. Schema migrations only. The five users and three sample
  projects are inserted by an idempotent seed command (`python -m app.seed`) that runs at startup
  only when the `users` table is empty.
- **Rationale**: The spec says sample data loads once at first start and is not reset. Keeping seed
  data out of migrations means tests and a future PostgreSQL database can migrate without demo data.
- **Alternatives considered**: Data migration in Alembic (rejected: couples demo data to schema
  history); fixtures file loaded on every start (rejected: would reset data).

## R5. Task ordering and the move endpoint (FR-010, FR-013, clarification on placement)

- **Decision**: Each task has an integer `position`, gapless from 0 within its `(project, column)`.
  `POST /api/v1/tasks/{id}/move` takes `column` and an optional `position` (0-based target index).
  The server, in one transaction, removes the task from its old column, inserts it at the target
  index (or at the end when `position` is omitted, used by the keyboard "Move to" menu), and
  renumbers the affected columns. New tasks get `position = count` in To Do. Same column and same
  index is a no-op that returns 200 without an audit entry (edge case: drop back on the same column).
- **Rationale**: With at most a few hundred tasks per board, renumbering is cheap and keeps the data
  simple and portable. Last write wins naturally because each move is applied to current state.
- **Alternatives considered**: Fractional/lexorank positions (rejected: more complex, needs
  rebalancing, unnecessary at this scale); client-sent full order lists (rejected: larger payloads
  and race-prone).

## R6. Real-time updates (user input; spec allows refresh-only)

- **Decision**: One WebSocket endpoint `GET /api/v1/ws?user=<id>`. An in-process
  `ConnectionManager` holds open sockets. Services publish domain events **after the transaction
  commits**; the manager broadcasts them as JSON envelopes (see
  [contracts/websocket.md](contracts/websocket.md)). Events carry the full updated resource so
  clients upsert idempotently, including events caused by their own requests. The Angular
  `RealtimeService` reconnects with exponential backoff (1s → 30s) and, after a reconnect, reloads
  the open board so missed events cannot leave stale state.
- **Security**: The handshake checks `Origin` against the allowed CORS origins (prevents
  cross-site WebSocket hijacking) and validates the `user` id; invalid handshakes are closed with
  code 4401 or 4403. Clients cannot send commands over the socket; inbound messages other than
  `ping` are ignored.
- **Constraint**: In-process broadcasting requires running Uvicorn with one worker. A broker
  (e.g., Redis pub/sub or PostgreSQL LISTEN/NOTIFY) is needed before scaling out; noted for later.
- **Rationale**: Exceeds the spec's refresh requirement at low cost and gives immediate feedback on
  every viewer's board.
- **Alternatives considered**: Server-Sent Events (rejected: user asked for WebSocket); polling
  (rejected: slower and wasteful).

## R7. Notifications requested in the input

- **Decision**: **Not planned.** The spec lists notifications as out of scope for this phase, so no
  notification entity, REST endpoints, or notification WebSocket events are included.
- **Rationale**: The spec is the source of requirements; adding a feature it excludes needs a spec
  change first. The WebSocket envelope has a `type` field, so notification events can be added
  later without breaking clients.
- **Follow-up**: If notifications are wanted, update the spec with `/speckit-specify` or
  `/speckit-clarify`, then re-run `/speckit-plan`.

## R8. Validation and error responses (Principle II, FR-020 to FR-024)

- **Decision**: Pydantic v2 request models with `extra="forbid"`, `str_strip_whitespace=True`,
  explicit `min_length`/`max_length`, enums for columns, and positive integer ids. A shared error
  handler converts validation errors, domain errors and unexpected exceptions into one envelope:
  `{"error": {"code", "message", "fields"?}, "request_id"}`. Unexpected exceptions return 500 with
  a generic message and are logged with the request id; no stack traces leave the server.
  Status codes: 401 `user_required`, 403 `not_comment_author`, 404 `not_found`, 409
  `project_name_taken`, 422 `validation_error`.
- **Rationale**: One predictable format lets the frontend map field errors onto form fields (S2,
  S3 designs) and satisfies FR-024.
- **Output encoding**: The frontend renders all user text through Angular interpolation only;
  `innerHTML` and `bypassSecurityTrust*` are banned by lint rule. Markup therefore shows as text
  (FR-021, design S4).

## R9. Angular 21 frontend architecture

- **Decision**: Standalone components, signals for state, zoneless change detection (Angular 21
  default), lazy-loaded feature routes, `HttpClient` with functional interceptors. State lives in
  small signal stores (`CurrentUserStore`, `BoardStore`, `ProjectsStore`) that merge REST responses
  and WebSocket events. Drag and drop uses CDK `cdkDropListGroup`/`cdkDropList`/`cdkDrag`; on drop the
  store updates optimistically, calls the move endpoint, and rolls back on error.
- **Keyboard access (FR-013, FR-025)**: Each card has a "Move to" menu button (CDK Menu) and the task
  drawer has a Status select; both call the same move endpoint without `position`.
- **Rationale**: Matches the user's stack and the Angular 21 defaults; signals keep board updates
  cheap for 200 cards (SC-007).
- **Alternatives considered**: NgRx (rejected: too heavy for three stores); zone-based change
  detection (rejected: not the Angular 21 default).

## R10. Generated API client

- **Decision**: A backend script exports FastAPI's OpenAPI document to
  `frontend/src/app/core/api/openapi.json`; `ng-openapi-gen` generates typed models and Angular
  `HttpClient` services into `frontend/src/app/core/api/generated/` (`npm run api:generate`).
  A backend contract test fails if the committed `openapi.json` differs from `app.openapi()`.
- **Rationale**: `ng-openapi-gen` is Node-only (no Java) and emits Angular-native services. The drift
  test is the provider/consumer contract check required by the constitution's quality gates.
- **Alternatives considered**: OpenAPI Generator `typescript-angular` (rejected: needs Java);
  `openapi-typescript` types only (rejected: user asked for a client, not just types).

## R11. Testing

- **Decision**: Backend: `pytest`, `pytest-asyncio`, `httpx.AsyncClient` with `ASGITransport`; each
  test session uses a separate SQLite file in a temp directory, migrated with `alembic upgrade
  head`, and each test runs in a rolled-back transaction or a fresh seeded database. WebSocket tests
  use Starlette's `TestClient` websocket support. Frontend: Angular 21's default unit test runner
  (Vitest through `ng test`) for components, stores and interceptors.
- **Coverage focus**: every validation rule with malformed and markup inputs (SC-005), comment
  ownership (SC-006), move and renumber logic, case-insensitive project names, audit entries, error
  envelope, WebSocket Origin and user checks.
- **Alternatives considered**: An in-memory SQLite database (rejected: does not exercise WAL or
  migrations and behaves differently across connections).

## R12. Observability (Principle V)

- **Decision**: JSON structured logging via the standard `logging` module with a JSON formatter. A
  middleware reads or creates `X-Request-ID`, stores it in a context variable, adds it to every log
  line and response, and the Angular interceptor sends a fresh id per request. `GET
  /api/v1/health` reports database reachability. `GET /api/v1/metrics` returns in-process counters
  (requests by route and status, latency buckets, open WebSocket connections) as JSON. The `audit`
  module writes an `audit_entries` row in the same transaction as each change (FR-023). Logs never
  include request bodies, comment text, or headers other than the request id.
- **Alternatives considered**: Prometheus client (rejected for now: extra dependency with no
  scraper in a local setup; the JSON endpoint can be swapped later).

## R13. Local security posture (constitution Security Requirements)

- **Decision**: Uvicorn binds to `127.0.0.1` only. CORS allows only the Angular dev server origin
  from settings (`http://localhost:4200`). Responses include `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and a restrictive CSP on API responses.
  No secrets are needed in this phase; settings come from `.env` via pydantic-settings and `.env` is
  git-ignored with a committed `.env.example`. Dependencies are pinned (`requirements.txt` with
  hashes or a lock file, `package-lock.json`) and scanned with `pip-audit` and `npm audit`.
- **Not in this phase (justified in plan.md)**: authentication, TLS, rate limiting. All three
  depend on exposing Taskify beyond the local machine, which the spec forbids until authentication
  exists.
