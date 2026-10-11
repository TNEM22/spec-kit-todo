# WebSocket Contract: Taskify v1

**Endpoint**: `ws://127.0.0.1:8000/api/v1/ws?user=<user id>` | **Research**: [../research.md](../research.md) R6, R7

Server-to-client only. One socket per browser tab carries two kinds of events:

- **Board events** go to every connected client, so every open board and task stays current
  without a refresh (FR-015).
- **Notification events** go only to the sockets of their recipient (FR-029, FR-031).

REST stays the only way to change data.

## Handshake

| Check | Failure |
|-------|---------|
| `Origin` header is in the allowed CORS origins | Close `4403 origin_not_allowed` (logged; audited with reason `origin_not_allowed`, route `WS /ws`) |
| `user` query parameter is an existing user id | Close `4401 user_required` (logged; audited with reason `user_required`, route `WS /ws`) |

On success the server sends `{"type": "hello", "data": {"user_id": <id>}}`. The server registers the
socket under that user id for targeted delivery. When the user switches identity, the client closes
the socket and opens a new one with the new id.

## Client messages

| Message | Server response |
|---------|-----------------|
| `{"type": "ping"}` | `{"type": "pong"}` |
| Anything else | Ignored (not an error; never executed) |

Clients send `ping` every 25 s; the server closes sockets silent for 60 s.

## Event envelope

```json
{
  "type": "task.moved",
  "event_id": "b1e0...",
  "occurred_at": "2026-10-11T09:02:00Z",
  "actor_id": 2,
  "project_id": 1,
  "request_id": "6f1c2b0e-...",
  "data": { }
}
```

### Board events (broadcast to all)

| Type | `data` | Sent when |
|------|--------|-----------|
| `project.created` | `ProjectOut` | A project is created |
| `task.created` | `TaskOut` | A task is created |
| `task.updated` | `TaskOut` | Title, description or assignee changes |
| `task.moved` | `{ task: TaskOut, from_column, columns: { <col>: [task ids in order] } }` | A task changes column or position; `columns` lists the final order of every affected column |
| `comment.created` | `CommentOut` | A comment is added |
| `comment.updated` | `CommentOut` | A comment is edited |
| `comment.deleted` | `{ comment_id, task_id }` | A comment is deleted |

### Notification events (recipient only)

| Type | `data` | Sent when |
|------|--------|-----------|
| `notification.created` | `{ notification: NotificationOut, unread_count }` | A change creates a notification for this user (data-model "Creation rules") |
| `notifications.read` | `{ ids: [int] \| "all", unread_count }` | The same user marks one or all as read in another tab |

`request_id` is the `X-Request-ID` of the REST request that caused the event (Constitution V correlation id); it is null for server-initiated messages. `project_id` in the envelope is set for board events and for `notification.created`; it is null for
`notifications.read`.

Resource shapes are defined in [rest-api.md](rest-api.md). Clients apply events idempotently
(upsert by id, replace column order from `columns`, take `unread_count` as the new count), including
events caused by their own requests.

## Client behavior

- Reconnect with exponential backoff (1 s doubling to 30 s). While not connected, show the
  "Reconnecting…" indicator (FR-015).
- After a reconnect, reload the open board, the project list and `GET /notifications` over REST,
  because events sent while disconnected are not replayed (FR-015, FR-029), then hide the
  indicator.
- Keep the project list current from `project.created`, `task.created` and `task.moved` (column
  counts come from the `columns` lists) (FR-015).
- While the user is dragging a card, queue incoming board events and apply them after the drop's
  move request completes (spec edge case; research R14).
- When `task.updated` arrives for the task open in the drawer and a field has unsaved changes, keep
  the user's text and show "<Actor> changed this task"; update unchanged fields in place.
- On switching user, close the socket, clear all per-user state (notifications, open task, drafts)
  and reconnect with the new id (FR-031).
- On `comment.deleted` for a comment the user is editing, close the editor and show the
  "That comment no longer exists" toast (design `not-found-toast`).
- On `notification.created`, update the bell count and, if the panel is open, insert the item at the
  top. No pop-up toast (spec clarification).

## Not included in this phase

Presence, typing indicators, email or push delivery, and any client-to-server commands.
