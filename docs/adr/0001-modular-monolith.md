# ADR 0001 — Modular Monolith Architecture

**Date**: 2026-10-11  
**Status**: Accepted  
**Deciders**: Project maintainers  
**Constitution reference**: Principle III (Modular Monolith Architecture, v2.0.0+)

## Context

Taskify needs a backend that is simple to run locally (a single command, no orchestration) and
deployable as one unit, yet keeps the code understandable as the feature set grows. The initial
requirement covers six business domains: users, projects, tasks, comments, notifications and audit.

## Decision

We use a **single deployable Python FastAPI application** (`python -m app`) organised into domain
modules. Each domain (users, projects, tasks, comments, notifications, audit) owns its SQLAlchemy
models, Pydantic schemas, and service functions. No code in one domain reads or writes another
domain's tables directly; it calls the other domain's public service functions.

The external API is versioned under `/api/v1`. Data access goes through the SQLAlchemy ORM so the
database engine can change by configuration. The application is buildable, testable, and deployable
as a single unit; each domain is independently testable through its service functions.

## Consequences

**Positive**
- One `python -m app` command starts everything, including the WebSocket endpoint.
- Transactions span all domains in a single request without a distributed-transaction protocol.
- Local development requires no container orchestration.
- A domain can be extracted into its own service later without a rewrite, because domain
  boundaries are enforced by a unit test that scans imports (`test_domain_boundaries.py`).

**Negative / Trade-offs**
- All domains share one process, so a memory or performance issue in one affects the others.
- Horizontal scaling requires a separate session store or sticky sessions for the WebSocket.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Microservices from day one | Adds distributed-transaction complexity and container orchestration for a small team; the constitution (Principle III) explicitly prohibits it without justification. |
| Serverless functions | WebSocket and long-lived async tasks do not fit the stateless serverless model. |

