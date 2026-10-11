# REST API Contract: Taskify v1

**Base path**: `/api/v1` | **Format**: JSON (UTF-8) | **Data model**: [../data-model.md](../data-model.md)

FastAPI's generated OpenAPI document (`/api/v1/openapi.json`, docs at `/api/v1/docs`) is the
machine-readable form of this contract. The committed copy at
`frontend/src/app/core/api/openapi.json` must match it (research R10).

## Conventions

- **Identity**: every endpoint except those marked *public* requires header
  `X-Taskify-User: <user id>`. Missing, malformed or unknown → `401 user_required`.
- **Request id**: clients may send `X-Request-ID`; the server echoes it (or a generated one) in the
  response header and error body.
- **Timestamps**: ISO 8601 UTC, e.g. `2026-10-11T09:02:00Z`.
- **Columns**: `todo`, `in_progress`, `in_review`, `done`.
- **Strings** are NFC-normalized and trimmed server-side; length limits count user-perceived
  characters (an emoji counts as one; research R14); unknown body fields are rejected.
- **Binding**: the API listens on `127.0.0.1` only in this phase (spec Security Considerations).
- **Not provided in this phase**: delete or update of projects, delete of tasks, any user
  mutation, deleting notifications, audit log access.

### Error envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields are invalid.",
    "fields": [{ "field": "title", "message": "Title is required. Enter 1 to 200 characters." }]
  },
  "request_id": "6f1c2b0e-..."
}
```

Field messages name the field and the rule broken (e.g., "Title is required. Enter 1 to 200
characters."); `message` is the short form-level summary (FR-020). Messages never contain stack
traces, database or file details, server names, or ids other than project and task numbers
(FR-024).

| Status | Code | When |
|--------|------|------|
| 401 | `user_required` | No valid selected user (audited) |
| 403 | `not_comment_author` | Editing or deleting another user's comment ("not allowed"; audited) |
| 404 | `not_found` | Project, task, comment or user does not exist, or a notification belongs to someone else |
| 409 | `project_name_taken` | Project name already used (ignoring case) |
| 422 | `validation_error` | Body, query or path fails validation; `fields` lists each problem (audited, without field values) |
| 500 | `internal_error` | Unexpected failure; generic message only |

## Resources

```text
UserOut       { id, display_name, role, initials, avatar_color }
ProjectOut    { id, name, description|null, created_at }
ProjectSummary  ProjectOut + { counts: { todo, in_progress, in_review, done }, assigned_to_me: int }
TaskOut       { id, project_id, title, description|null, column, position,
                assignee: UserOut|null, created_at, updated_at, comment_count }
BoardOut      { project: ProjectOut,
                columns: { todo: TaskOut[], in_progress: TaskOut[], in_review: TaskOut[], done: TaskOut[] } }
CommentOut    { id, task_id, author: UserOut, body, created_at, edited_at|null }
NotificationOut { id, type: "task_assigned"|"task_commented"|"task_moved", actor: UserOut,
                  project: { id, name }, task_id, task_title, to_column|null,
                  comment_preview|null, created_at, read: bool }
NotificationList { items: NotificationOut[], unread_count: int }
```

## Endpoints

### Health and metrics

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | public | `200 { "status": "ok", "database": "ok" }`; `503` if the database is unreachable |
| GET | `/metrics` | public | `200` JSON counters (requests by route/status, latency buckets, open sockets) |

### Users (FR-001 to FR-004)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/users` | public | `200 UserOut[]`, the five users, Product Manager first |
| GET | `/users/me` | user | `200 UserOut` for the selected user (used to validate a stored selection) |

### Projects (FR-006 to FR-008)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/projects` | — | `200 ProjectSummary[]`, ordered by `created_at` |
| POST | `/projects` | `{ name: 1–100, description?: ≤1000 }` | `201 ProjectOut`; `409`, `422` |
| GET | `/projects/{project_id}` | — | `200 ProjectOut`; `404` |
| GET | `/projects/{project_id}/board` | — | `200 BoardOut`, each column ordered by `position`; `404` |

### Tasks (FR-009 to FR-016)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/projects/{project_id}/tasks` | `{ title: 1–200, description?: ≤5000, assignee_id?: int\|null }` | `201 TaskOut` at the bottom of To Do; `404`, `422` |
| GET | `/tasks/{task_id}` | — | `200 TaskOut`; `404` |
| PATCH | `/tasks/{task_id}` | Any of `{ title, description, assignee_id }`; `assignee_id: null` clears | `200 TaskOut`; `404`, `422` |
| POST | `/tasks/{task_id}/move` | `{ column, position?: int ≥ 0 }` | `200 TaskOut`; `404`, `422` |

**Move semantics** (data-model "Placement rules"): `position` present → insert at that index
(clamped); absent → bottom of `column`. Same column and same index → `200` with unchanged task and
no event. The response reflects final placement after renumbering.

### Comments (FR-017 to FR-019)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/tasks/{task_id}/comments` | — | `200 CommentOut[]`, oldest first; `404` |
| POST | `/tasks/{task_id}/comments` | `{ body: 1–2000 }` | `201 CommentOut` (author = selected user); `404`, `422` |
| PATCH | `/comments/{comment_id}` | `{ body: 1–2000 }` | `200 CommentOut` with `edited_at` set; `403`, `404`, `422` |
| DELETE | `/comments/{comment_id}` | — | `204`; `403`, `404` |

### Notifications (FR-026 to FR-031)

All notification endpoints act only on the selected user's notifications. A notification id that
does not exist **or belongs to another user** returns `404 not_found`.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/notifications?limit=1..100` | — | `200 NotificationList`, newest first; `limit` defaults to 100 |
| POST | `/notifications/{notification_id}/read` | — | `200 NotificationOut` with `read: true` (idempotent); `404` |
| POST | `/notifications/read-all` | — | `200 { "unread_count": 0 }` |

Notifications are created only as a side effect of task and comment changes (see data-model
"Creation rules"); there is no endpoint to create, edit or delete them.

### Real-time

| Method | Path | Contract |
|--------|------|----------|
| GET (WebSocket) | `/ws?user=<id>` | See [websocket.md](websocket.md) |

## Side effects

Every successful mutation (POST, PATCH, move, DELETE) in one transaction:

1. applies the change,
2. writes an `AuditEntry` (data-model) with the selected user as actor,
3. creates any notifications the change triggers and trims each recipient to 100,
4. after commit, publishes the matching board event to everyone and each `notification.created`
   event to its recipient only.

A failed request changes nothing (FR-020). Refused requests (401, 403, 422) additionally write one
`request.refused` audit entry with the reason and route template, but never the submitted values
(FR-023, research R14). Marking notifications read changes only `read_at` and
publishes `notifications.read` to the same user's other connections; it writes no audit entry.
