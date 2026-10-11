# Data Model: Taskify Kanban Board

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md) | **Date**: 2026-10-11

Portable across SQLite and PostgreSQL (see research R3). All timestamps are UTC, timezone-aware.
Each table is owned by one backend domain (research R1); other domains access it only through the
owning service.

## Overview

```text
User 1───* Task (assignee, optional)
User 1───* Comment (author)
User 1───* AuditEntry (actor)
User 1───* Notification (recipient)
User 1───* Notification (actor)
Project 1───* Task
Task 1───* Comment
Task 1───* Notification
```

## User — owned by `users`

Fixed sample data; no create, update or delete in this phase (FR-001, FR-004).

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | Assigned by seed |
| display_name | string(60) | Required, unique |
| role | enum `product_manager` \| `engineer` | Required |
| initials | string(3) | Required; shown in avatars |
| avatar_color | string(7) | Hex color from [design/tokens.md](design/tokens.md) |

Seed: Alex Morgan (product_manager), Sam Lee, Jordan Patel, Riley Chen, Taylor Brooks (engineer).

## Project — owned by `projects`

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | |
| name | string(100) | Required, trimmed, 1–100 chars (FR-007) |
| name_key | string(100), unique index | `casefold()` of trimmed name; enforces case-insensitive uniqueness |
| description | string(1000), nullable | Trimmed; empty string stored as null |
| created_at | UTC datetime | Set on insert |

- Visible to all users (FR-008). No update or delete endpoints in this phase.
- Duplicate `name_key` → `409 project_name_taken`.

## Task — owned by `tasks`

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | |
| project_id | FK → Project.id, indexed | Required; must exist (FR-022) |
| title | string(200) | Required, trimmed, 1–200 chars (FR-010) |
| description | string(5000), nullable | Trimmed; empty string stored as null |
| column | enum `todo` \| `in_progress` \| `in_review` \| `done` | Default `todo` (FR-009) |
| position | integer ≥ 0 | Gapless 0..n-1 within `(project_id, column)` |
| assignee_id | FK → User.id, nullable | Must be one of the five users or null (FR-012) |
| created_at | UTC datetime | Set on insert |
| updated_at | UTC datetime | Set on every change, including moves |

- Index `(project_id, column, position)` for board reads.
- No delete in this phase.

### Column state transitions

Any column → any other column, in either direction, by any user (FR-013, clarification Q1). There
are no forbidden transitions.

```text
todo ⇄ in_progress ⇄ in_review ⇄ done   (plus direct jumps between any two)
```

### Placement rules (FR-010, FR-013, research R5)

| Operation | Result |
|-----------|--------|
| Create | `column = todo`, `position = count of todo tasks` (bottom) |
| Move with `position` (drag and drop) | Inserted at that index in the target column; index clamped to 0..count |
| Move without `position` (keyboard menu, Status select) | Appended to the bottom of the target column |
| Move to same column and same index | No change, no audit entry |
| After any move | Source and target columns renumbered gapless in the same transaction |

Concurrent edits or moves: last committed write wins (spec Edge Cases).

## Comment — owned by `comments`

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | |
| task_id | FK → Task.id, indexed | Required; must exist |
| author_id | FK → User.id | Set from the selected user, never from the request body |
| body | string(2000) | Required, trimmed, 1–2000 chars (FR-017) |
| created_at | UTC datetime | Set on insert |
| edited_at | UTC datetime, nullable | Set on each edit; non-null means "edited" (FR-019) |

- Listed oldest first by `created_at`, then `id` (FR-018).
- Edit or delete only when `author_id` equals the selected user, otherwise `403
  not_comment_author` (FR-019). No role exceptions (clarification Q2).
- Delete is a hard delete; the audit entry keeps a record (clarification Q4).

## AuditEntry — owned by `audit`

Written in the same transaction as the change it records (FR-023). Not exposed through the API or
UI (clarification on audit visibility).

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | |
| occurred_at | UTC datetime, indexed | |
| actor_id | FK → User.id | Selected user who made the change |
| action | enum: `project.created`, `task.created`, `task.updated`, `task.assigned`, `task.moved`, `comment.created`, `comment.updated`, `comment.deleted` | |
| entity_type | enum `project` \| `task` \| `comment` | |
| entity_id | integer | Id of the changed entity (kept after comment deletion) |
| changes | JSON text | Changed fields as `{field: [old, new]}`; for `comment.deleted` the removed body. No other personal data |
| request_id | string(64), nullable | Correlates with logs (research R12) |

## Notification — owned by `notifications`

A message to one user about another user's change to their work (FR-026 to FR-031, research R7).

| Field | Type | Rules |
|-------|------|-------|
| id | integer, PK | |
| recipient_id | FK → User.id | The task's assignee at the time of the change; never equals `actor_id` |
| actor_id | FK → User.id | The selected user who made the change |
| type | enum `task_assigned` \| `task_commented` \| `task_moved` | |
| project_id | FK → Project.id | Project of the task |
| task_id | FK → Task.id | Task the notification opens |
| task_title | string(200) | Snapshot of the task title when created |
| to_column | enum column, nullable | Set only for `task_moved` |
| comment_id | integer, nullable | Set only for `task_commented`; not a foreign key (comments can be deleted) |
| comment_preview | string(140), nullable | First 140 chars of the comment; cleared when the comment is deleted |
| created_at | UTC datetime | |
| read_at | UTC datetime, nullable | Null means unread |

- Index `(recipient_id, created_at DESC, id DESC)` for the panel, and `(recipient_id, read_at)` for the
  unread count.
- Users cannot create, edit or delete notifications; they can only mark them read.

### Creation rules

| Trigger (owning service) | Recipient | Created when |
|--------------------------|-----------|--------------|
| Task created with an assignee (`tasks`) | New assignee | assignee ≠ actor |
| Task assignee changed to a user (`tasks`) | New assignee | assignee ≠ actor |
| Comment added (`comments`) | Task's assignee | assignee exists and ≠ actor |
| Task moved to a different column (`tasks`) | Task's assignee | assignee exists and ≠ actor; not for same-column reorder |

Not notified: clearing an assignee, title or description edits, comment edits or deletions, and
project creation. Reassigning does not withdraw earlier notifications (spec edge case).

### Lifecycle

```text
created (unread) ──mark read / open──► read
        └──── removed automatically when more than 100 newer notifications exist for the recipient
```

## Validation summary

All rules are enforced server-side (FR-020) after trimming; whitespace-only input counts as empty.

| Input | Rule | Error |
|-------|------|-------|
| `X-Taskify-User` | Present, integer, existing user | 401 `user_required` |
| Project name | 1–100 chars, unique ignoring case | 422 `validation_error` / 409 `project_name_taken` |
| Project description | ≤ 1000 chars | 422 |
| Task title | 1–200 chars | 422 |
| Task description | ≤ 5000 chars | 422 |
| Assignee | Existing user id or null | 422 |
| Column | One of the four enum values | 422 |
| Position | Integer ≥ 0 | 422 |
| Comment body | 1–2000 chars | 422 |
| Path ids | Positive integers that exist | 404 `not_found` |
| Notification id | Exists **and** belongs to the selected user | 404 `not_found` |
| Notification list `limit` | Integer 1–100, default 100 | 422 |
| Unknown request fields | Rejected | 422 |
