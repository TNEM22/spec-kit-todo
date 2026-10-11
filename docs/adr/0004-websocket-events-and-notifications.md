# ADR 0004 — WebSocket Events and Per-Recipient Notifications

**Date**: 2026-10-11  
**Status**: Accepted  
**Deciders**: Project maintainers  
**Constitution reference**: Principle V (Observability & Auditability)

## Context

Taskify needs two kinds of real-time delivery:

1. **Board events** (`project.*`, `task.*`, `comment.*`): broadcast to every connected client so
   open boards and the project list stay current.
2. **Notifications** (`notification.created`, `notifications.read`): delivered only to the
   recipient's sockets, never to other users.

Notifications must be durable (survive a WebSocket disconnection) and consistent (never sent without
the row that triggered them being committed).

## Decision

- **One WebSocket per tab** connects to `GET /api/v1/ws?user=<id>`. The server validates the
  `Origin` header against `CORS_ORIGINS` (close 4403, audited) and the user id (close 4401, audited).
- **`ConnectionManager`** keeps sockets grouped by user id. `broadcast(event)` sends to every socket;
  `send_to_user(user_id, event)` sends only to that user's sockets.
- **Events are queued on the session** and sent only after the database transaction commits;
  they are discarded on rollback. This guarantees that a notification is delivered if and only if
  the triggering row is committed.
- **Notification rows** are written in the same transaction as their triggering change (move, create
  task with assignee, update assignee, create comment, delete comment clears the preview).
- The `request_id` of the REST request that caused an event is carried in the event envelope so
  the frontend can correlate board updates with the actions that caused them.

## Consequences

**Positive**
- No message broker required: events are sent in-process after commit.
- Notification privacy is enforced at the connection level.
- A reconnecting client reloads missed data (stores call their load functions on `reconnected`).

**Negative / Trade-offs**
- In-process broadcast does not scale horizontally (multiple Uvicorn workers would not share the
  `ConnectionManager`). A message broker (Redis pub/sub) is needed before running with more than
  one worker.
- Events sent while a client is disconnected are not replayed; the client reloads the full state.

