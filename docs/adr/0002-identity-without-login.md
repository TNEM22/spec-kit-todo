# ADR 0002 — Identity Without Login

**Date**: 2026-10-11  
**Status**: Accepted (phase 1 deviation from Constitution Principle I)  
**Deciders**: Project maintainers  
**Constitution reference**: Principle I (Security-First), Complexity Tracking

## Context

Taskify phase 1 targets a team of five known users on a machine that is not exposed to untrusted
networks. Adding a real authentication system (passwords, tokens, sessions) is significant scope for
a phase whose goal is the Kanban board itself.

## Decision

Identity is an **opt-in selection, not a proof of identity**. The selected user's id travels in the
`X-Taskify-User` HTTP header (REST) and the `user` query parameter (WebSocket). The server
validates that the id exists in the seeded user list; if it does not, the request is rejected with
401 and the client returns to the user-selection screen.

The application binds exclusively to `127.0.0.1` (enforced by the run entry point, which has no
`--host` option). Every change and every refused request is recorded in the audit log with the
selected user's id.

## Consequences

**Positive**
- No login UI, no session management, no token rotation.
- The five-user assumption is explicit in the spec and the seed data.

**Negative / Trade-offs**
- Any user at the keyboard can select any identity (impersonation by design).
- No authentication means no per-user access control beyond author checks on comments and
  recipient checks on notifications.

## Migration Path

When authentication is added:
1. Replace `X-Taskify-User` with a signed token (e.g. JWT or session cookie).
2. Add a `require_auth` dependency that decodes the token and returns the user.
3. Remove the `X-Taskify-User` header from the OpenAPI spec.
4. Update the frontend interceptor and `CurrentUserStore`.
5. Remove this deviation from Complexity Tracking.

