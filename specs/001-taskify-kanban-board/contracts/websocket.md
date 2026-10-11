# WebSocket Contract: Taskify v1

**Endpoint**: `ws://127.0.0.1:8000/api/v1/ws?user=<user id>` | **Research**: [../research.md](../research.md) R6

Server-to-client only. The socket pushes changes made by any user so every open board stays current
without a refresh. REST stays the only way to change data.

## Handshake

| Check | Failure |
|-------|---------|
| `Origin` header is in the allowed CORS origins | Close `4403 origin_not_allowed` |
| `user` query parameter is an existing user id | Close `4401 user_required` |

On success the server sends `{"type": "hello", "data": {"user_id": <id>}}`.

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
  "data": { }
}
```

| Type | `data` | Sent when |
|------|--------|-----------|
| `project.created` | `ProjectOut` | A project is created |
| `task.created` | `TaskOut` | A task is created |
| `task.updated` | `TaskOut` | Title, description or assignee changes |
| `task.moved` | `{ task: TaskOut, from_column, columns: { <col>: [task ids in order] } }` | A task changes column or position; `columns` lists the final order of every affected column |
| `comment.created` | `CommentOut` | A comment is added |
| `comment.updated` | `CommentOut` | A comment is edited |
| `comment.deleted` | `{ comment_id, task_id }` | A comment is deleted |

Resource shapes are defined in [rest-api.md](rest-api.md). Events are broadcast to every connected
client, including the one whose request caused them; clients apply them idempotently (upsert by id,
replace column order from `columns`).

## Client behavior

- Reconnect with exponential backoff (1 s doubling to 30 s).
- After a reconnect, reload the open board and project list over REST, because events sent while
  disconnected are not replayed.
- On `comment.deleted` for a comment the user is editing, close the editor and show the
  "That comment no longer exists" toast (design `not-found-toast`).

## Not included in this phase

Notification events (out of scope in the spec), presence, typing indicators, and any
client-to-server commands.
