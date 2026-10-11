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
- **Strings** are trimmed server-side; unknown body fields are rejected.
- **Not provided in this phase**: delete or update of projects, delete of tasks, any user
  mutation, notifications, audit log access.

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

| Status | Code | When |
|--------|------|------|
| 401 | `user_required` | No valid selected user |
| 403 | `not_comment_author` | Editing or deleting another user's comment |
| 404 | `not_found` | Project, task, comment or user does not exist |
| 409 | `project_name_taken` | Project name already used (ignoring case) |
| 422 | `validation_error` | Body, query or path fails validation; `fields` lists each problem |
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

### Real-time

| Method | Path | Contract |
|--------|------|----------|
| GET (WebSocket) | `/ws?user=<id>` | See [websocket.md](websocket.md) |

## Side effects

Every successful mutation (POST, PATCH, move, DELETE) in one transaction:

1. applies the change,
2. writes an `AuditEntry` (data-model) with the selected user as actor,
3. after commit, publishes the matching WebSocket event.

A failed request changes nothing (FR-020).
