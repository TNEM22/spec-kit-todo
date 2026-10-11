<!--
Sync Impact Report
- Version change: 2.0.0 → 2.1.0 (MINOR: new "Technology Stack" section)
- Added sections:
  - Technology Stack: languages, frameworks and runtime versions for backend and frontend,
    verified on the development machine on 2026-10-11 (Node.js 24.14.0, npm 11.11.0,
    Angular CLI 21.2.0, Python 3.12.10); upgrade rules
- Modified principles: none
- Removed sections: none
- Follow-up: backend Python packages are not installed yet (they belong in the project
  virtualenv); exact versions get pinned in backend/requirements*.txt and frontend/package-lock.json
  when the projects are created (/speckit-tasks, /speckit-implement).
- Deferred TODOs: none

Previous amendment in this session:
- Version change: 1.0.0 → 2.0.0 (MAJOR: Principle III redefined)
- Modified principles:
  - III. Microservices Architecture → III. Modular Monolith Architecture (redefined: one
    deployable FastAPI application with strict domain boundaries replaces independently
    deployable services)
  - I. Security-First: "every service" wording → "every domain and component" (no rule change)
  - II. Validate All Inputs: "inter-service messages" → "WebSocket messages and events between
    domains" (no rule change)
  - IV. Fully Documented Code: README and contract rules now apply to the backend application,
    the frontend application, and each domain (adapted to the new architecture)
  - V. Observability & Auditability: correlation ID propagated across requests, domain calls and
    WebSocket events instead of service calls (adapted)
- Modified sections:
  - Security Requirements: central auth mechanism shared by all domains (was: all services)
  - Development Workflow & Quality Gates: contract tests now between backend API and frontend
    client, plus a domain-boundary check in review
- Added sections: none
- Removed sections: none
- Follow-up: plan.md for 001-taskify-kanban-board lists the monolith as a deviation in Complexity
  Tracking; that row can be removed on the next /speckit-plan run.
- Deferred TODOs: none
-->

# Taskify Constitution

## Core Principles

### I. Security-First (NON-NEGOTIABLE)

Security is a design input, not a later review step. Every feature, domain, and change MUST
consider its threat surface before implementation begins.

- Each spec and plan MUST include a security considerations section covering authentication,
  authorization, data exposure, and abuse cases.
- Least privilege MUST apply: every component, account, and token gets only the permissions it
  needs.
- Default behavior MUST be deny: unauthenticated or unauthorized requests are rejected unless a
  route is explicitly declared public.
- Secrets MUST NOT appear in source code, logs, or client-visible responses; they are loaded from
  a secrets store or environment configuration.
- Known vulnerabilities in dependencies at high or critical severity MUST be resolved or
  formally risk-accepted before release.

Rationale: Taskify handles user and team data; security defects are the most expensive class of
defect to fix after release.

### II. Validate All Inputs (NON-NEGOTIABLE)

All data crossing a trust boundary MUST be validated before use. This includes user input in the
UI, API request bodies, query and path parameters, headers, uploaded files, WebSocket messages,
and data read from external systems.

- Validation MUST be server-side; client-side validation is a usability aid only.
- Inputs MUST be checked against an explicit schema (type, format, length, range, allowed values)
  using an allow-list approach.
- Invalid input MUST be rejected with a clear, non-leaking error; it MUST NOT be silently coerced.
- Output MUST be encoded for its context (HTML, SQL, shell, URL); queries MUST use parameterized
  statements.
- Every validation rule MUST be covered by tests that include malformed and malicious inputs.

Rationale: Unvalidated input is the root cause of injection, XSS, and most data-integrity bugs.

### III. Modular Monolith Architecture

Taskify's backend is one deployable Python FastAPI application, organized into domains that each
own one bounded business capability (for example users, projects, tasks, comments, notifications,
audit).

- Each domain MUST own its tables, models, schemas, and service logic. Code in one domain MUST NOT
  read or write another domain's tables directly; it MUST call that domain's service functions.
- Domains MUST NOT import each other's ORM models or private helpers; only public service
  functions and schemas cross domain boundaries.
- The external API MUST be versioned (e.g., `/api/v1`). Breaking changes MUST use a new version and
  keep the previous version available until the frontend has migrated.
- The application MUST be buildable, testable, and deployable as a single unit; each domain MUST be
  testable on its own through its service functions.
- Data access MUST go through the ORM so the database engine can change by configuration.
- A new domain MUST be justified in the plan by a distinct capability; splitting purely for
  organizational reasons is not allowed. Extracting a domain into a separate service requires a
  constitution amendment.

Rationale: One application keeps local development, deployment, and transactions simple for a
small team, while strict domain ownership keeps the code understandable and lets a domain be
extracted later without a rewrite.

### IV. Fully Documented Code

Code MUST be understandable without asking its author.

- Every public module, class, function, and API endpoint MUST have documentation describing its
  purpose, parameters, return values, errors raised, and security-relevant behavior.
- The backend and frontend applications MUST each have a README covering responsibility, how to run
  and test it, configuration, and dependencies; each backend domain MUST have a module docstring
  stating what it owns.
- The external API MUST have a machine-readable contract (e.g., OpenAPI, plus an event schema for
  WebSocket messages) kept in sync with the implementation.
- Non-obvious logic and any security-related decision MUST have an inline comment explaining why.
- Significant architectural decisions MUST be recorded as decision records.
- A change is not complete until its documentation is updated in the same change.

Rationale: Documentation is the contract between the backend, the frontend, and the people who
maintain them.

### V. Observability & Auditability

The application MUST be observable enough to debug failures and investigate security events.

- The backend MUST emit structured logs with a correlation ID that follows each request through
  domain calls and into the WebSocket events it causes.
- Security-relevant events (sign-in, permission changes, access denials, validation failures)
  MUST be written to an audit log.
- Logs MUST NOT contain secrets, credentials, or unmasked personal data.
- The backend MUST expose health checks and basic metrics.

Rationale: Without tracing and audit trails, incidents cannot be diagnosed or proven.

## Technology Stack

These are the decided languages, frameworks and runtimes. Versions marked "verified" were confirmed
on the development machine on 2026-10-11.

| Area | Choice | Version rule |
|------|--------|--------------|
| Backend language | Python | 3.12.x (verified 3.12.10) |
| Backend framework | FastAPI on Uvicorn, Pydantic v2, pydantic-settings | Latest stable at project creation, Pydantic 2.x only |
| Data access | SQLAlchemy 2.x (async) with aiosqlite; Alembic migrations | SQLAlchemy 2.x only |
| Database | SQLite in WAL mode; PostgreSQL-compatible through the ORM | SQLite bundled with Python 3.12 |
| Backend tests | pytest, pytest-asyncio, httpx | Latest stable at project creation |
| Frontend language | TypeScript in strict mode | ~5.9 (the version Angular CLI 21.2 scaffolds) |
| Frontend framework | Angular, standalone components, signals, zoneless change detection | 21.x (verified Angular CLI 21.2.0) |
| Frontend libraries | Angular CDK (DragDrop, Menu, Dialog), RxJS | CDK matching the Angular minor; RxJS ~7.8 |
| Frontend tests | Angular's default unit test runner (Vitest) | As scaffolded by Angular CLI 21 |
| JavaScript runtime | Node.js | 24.x LTS (verified 24.14.0; Angular 21 supports ^20.19, ^22.12, >=24) |
| Package managers | npm for the frontend; pip with a virtualenv for the backend | npm 11.x (verified 11.11.0) |
| Containers | None in this phase; everything runs locally | — |

- Exact versions MUST be pinned: `frontend/package-lock.json` and `backend/requirements.txt` (plus
  `requirements-dev.txt`) are committed.
- The required runtimes MUST be declared in the repository (`.nvmrc` with `24`,
  `.python-version` with `3.12`, and `engines` in `frontend/package.json`) so tools and reviewers
  can check them.
- Patch and minor upgrades within the rules above MAY be made through the lock files after tests
  pass. A major-version change of any item in this table, or adding a new framework, MUST be
  recorded as a decision record and requires a MINOR amendment of this constitution.

## Security Requirements

- Authentication and authorization MUST use a single, centrally defined mechanism shared by all
  domains; domains MUST NOT implement their own credential handling.
- All traffic MUST be encrypted in transit (TLS); sensitive data MUST be encrypted at rest.
- Passwords, if stored, MUST be hashed with a modern adaptive algorithm (e.g., Argon2 or bcrypt).
- Public endpoints MUST apply rate limiting.
- Dependencies MUST be pinned and scanned for known vulnerabilities in CI.
- Error responses MUST NOT expose stack traces, internal identifiers, or infrastructure details.

## Development Workflow & Quality Gates

- Every change MUST go through code review; reviewers MUST confirm compliance with this
  constitution, with explicit attention to Principles I and II and to domain boundaries
  (Principle III).
- CI MUST pass before merge: build, tests (including input-validation tests), linting,
  documentation checks, and dependency vulnerability scanning.
- The plan for each feature MUST include a Constitution Check that lists any deviation and its
  justification; unjustified deviations block the plan.
- API contract changes MUST include contract tests on both sides: the backend's published
  contract and the frontend client generated from it.

## Governance

This constitution supersedes all other project practices. Where another guideline conflicts with
it, the constitution wins.

- **Amendments**: Proposed in writing, with rationale and a migration plan for existing code, and
  approved by the project maintainers before merge.
- **Versioning**: Semantic versioning. MAJOR for removing or redefining a principle; MINOR for a
  new principle or section, or materially expanded guidance; PATCH for clarifications and wording.
- **Compliance**: Every spec, plan, and pull request MUST be checked against this constitution.
  Complexity or deviation MUST be justified in the plan. Compliance is reviewed whenever the
  constitution is amended.

**Version**: 2.1.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-11
