# UI Screen Contracts: Taskify v1

**Designs**: [../design/manifest.md](../design/manifest.md) | **Tokens**: [../design/tokens.md](../design/tokens.md) |
**API**: [rest-api.md](rest-api.md), [websocket.md](websocket.md)

One contract per designed screen. Paths are under `frontend/src/app/`. Every route except
`/select-user` is protected by `userSelectedGuard`, which redirects to `/select-user` when no user is
stored in `sessionStorage` or `GET /users/me` returns 401 (FR-005).

The Stitch designs are visual references. Elements they added that the spec excludes (search,
notifications, analytics tabs, tags, ticket ids, due dates, checklists, sprint badge, team "+",
column "+"/"…" menus, realtime footer) are **not** part of any contract below.

## Global layout and behavior

- **Top navigation bar** (`shared/ui/top-nav`): Taskify wordmark (link to `/projects`), breadcrumb,
  current user chip (avatar, name, role) and a "Switch user" button that clears the selection and
  navigates to `/select-user` (FR-003). Shown on every screen except user selection.
- **Background**: `shared/ui/aurora-background` behind all routes.
- **Realtime**: `RealtimeService` connects after a user is selected and feeds `ProjectsStore`,
  `BoardStore` and `CommentsStore`.
- **Errors**: 401 anywhere → clear selection, go to `/select-user`. 404 → "not found" toast and
  refresh of the current view. 500 → toast "Something went wrong. Try again." with no details.
- **Accessibility (FR-025)**: WCAG 2.1 AA; every action keyboard-operable; visible teal focus ring;
  "my task" marked by the "You" chip, not color alone; dialogs trap focus and restore it on close.

---

## user-select — User selection

- **Design**: `design/screens/user-select/screen.html`, `screen.png`
- **Route**: `/select-user` (also the default for `/` when no user is selected)
- **Component**: `features/user-select/user-select.page.ts`
- **Inputs**: none
- **Data**: `GET /users` → five cards (avatar, name, role chip)
- **Actions**:
  - Choose a user (click or Enter/Space on a focused card) → `CurrentUserStore.select(id)` saves to
    `sessionStorage`, then navigate to `/projects`
- **States**: loading (five skeleton cards); load error (message with "Try again"); focused/hover card
- **Excluded**: password field, sign-up, any user editing

## projects — Project list

- **Design**: `design/screens/projects/screen.html` (exported image is empty; use the HTML)
- **Route**: `/projects`
- **Component**: `features/projects/projects.page.ts`, `features/projects/project-card/`
- **Inputs**: selected user
- **Data**: `GET /projects` → name, description, per-column counts bar, `assigned_to_me` badge
- **Actions**:
  - "Open board" or activate a card → `/projects/:projectId`
  - "New project" → opens `project-create` dialog
- **Realtime**: `project.created` adds a card; task events refresh counts
- **States**: loading skeleton grid; empty list (not expected after seed; show "No projects yet"
  with "New project"); load error with retry

## project-create — New project modal

- **Design**: `design/screens/project-create/screen.html`, `screen.png`
- **Entry**: dialog opened from `/projects`
- **Component**: `features/projects/project-create/project-create.dialog.ts`
- **Fields**: Project name (required, counter `n / 100`), Description (optional, counter `n / 1000`);
  preview of the four fixed columns
- **Actions**:
  - "Create project" → `POST /projects` → on 201 close and navigate to `/projects/:id`
  - "Cancel" / Escape / close icon → close without changes
- **States**: idle, submitting (button busy), field errors from 422, duplicate name from 409 (see
  `project-create-error`)

## project-create-error — New project duplicate name

- **Design**: `design/screens/project-create-error/screen.html`, `screen.png`
- **Entry**: same dialog after `409 project_name_taken` or `422`
- **Behavior**: name field gets the error border and message from the error envelope; focus moves
  to the first invalid field; dialog stays open with the user's input intact

## board — Project board

- **Design**: `design/screens/board/screen.html`, `screen.png`; variants: `variants/1` (long title
  clamp), `variants/2` (1024px horizontal scroll)
- **Route**: `/projects/:projectId`
- **Components**: `features/board/board.page.ts`, `board-column/`, `task-card/`, `move-menu/`
- **Inputs**: `projectId` route param, selected user
- **Data**: `GET /projects/:projectId/board` → title, description, four columns in fixed order with
  counts; cards show title (two-line clamp), assignee avatar and name or "Unassigned", "You" chip
  and teal edge when assigned to the selected user (FR-014, FR-016)
- **Actions**:
  - Drag a card to any column or position → optimistic update, `POST /tasks/:id/move` with
    `column` and `position`; rollback and toast on error (FR-013)
  - Card "Move to" menu (see `card-move-menu`) → `POST /tasks/:id/move` without `position`
  - Open a card (click or Enter) → `/projects/:projectId/tasks/:taskId` (drawer)
  - "New task" → opens `task-create` dialog
- **Realtime**: `task.created`, `task.updated`, `task.moved` for this project update the board
- **States**: loading (`board-loading`), empty (`board-empty`), not found project (toast and
  redirect to `/projects`), card mid-drag with dashed teal drop zone, narrow window (1024px)
  horizontal scroll with snap

## board-empty — Empty board

- **Design**: `design/screens/board-empty/screen.html` (exported image is empty; use the HTML)
- **Entry**: `board` when all four columns are empty
- **Behavior**: four columns with count 0; To Do shows empty state "No tasks yet" with a "New task"
  button; other columns show "Nothing here yet"

## board-loading — Board loading

- **Design**: `design/screens/board-loading/screen.html`, `screen.png`
- **Entry**: `board` while `GET /projects/:id/board` is pending
- **Behavior**: nav bar, title area and four columns with three skeleton cards each; count badges
  as skeleton pills; no spinner; `aria-busy="true"` on the board region

## card-move-menu — Keyboard "Move to" menu

- **Design**: `design/screens/card-move-menu/screen.html`, `screen.png`
- **Entry**: "more" button on any focused task card
- **Behavior**: menu lists the four columns with status dots; current column shown with a check and
  "Current" and disabled; arrow keys move, Enter selects → `POST /tasks/:id/move` without
  `position` (task goes to the bottom of the target column); Escape closes and returns focus to the
  card

## task-create — New task modal

- **Design**: `design/screens/task-create/screen.html`, `screen.png`
- **Entry**: dialog opened from `board`
- **Component**: `features/board/task-create/task-create.dialog.ts`
- **Fields**: Title (required, counter `n / 200`), Description (optional, counter `n / 5000`),
  Assignee select with "Unassigned" and the five users (data from `GET /users`)
- **Actions**: "Create task" → `POST /projects/:projectId/tasks` → on 201 close; the card appears at
  the bottom of To Do. "Cancel" closes.
- **States**: idle, submitting, validation errors (see `task-create-error`)

## task-create-error — New task validation error

- **Design**: `design/screens/task-create-error/screen.html`, `screen.png`
- **Entry**: same dialog after a 422 response or a client-side empty/whitespace title
- **Behavior**: banner "The task wasn't created. Fix the highlighted field."; field error message
  under Title; focus moves to the first invalid field; input kept. Client-side checks mirror the
  server rules but the server remains authoritative (FR-020).

## task-detail — Task detail drawer

- **Design**: `design/screens/task-detail/screen.html`, `screen.png`
- **Route**: `/projects/:projectId/tasks/:taskId` (child of `board`; board stays rendered behind)
- **Components**: `features/task-detail/task-detail.drawer.ts`, `comment-list/`, `comment-item/`,
  `comment-composer/`
- **Inputs**: `projectId`, `taskId` route params, selected user
- **Data**: `GET /tasks/:taskId`, `GET /tasks/:taskId/comments`; status chip, title, created/updated
  dates, Status select, Assignee select, description, comments (oldest first, author, time,
  "edited" marker)
- **Actions**:
  - Edit title or description inline → `PATCH /tasks/:taskId` (FR-011)
  - Change assignee, including "Unassigned" → `PATCH /tasks/:taskId` with `assignee_id` (FR-012)
  - Change Status → `POST /tasks/:taskId/move` without `position` (keyboard path for FR-013)
  - Add comment → `POST /tasks/:taskId/comments` (FR-017)
  - Edit / Delete on own comments only → see `comment-edit` (FR-019)
  - Close (icon, Escape, click on dimmed board) → back to `/projects/:projectId`
- **Realtime**: `task.updated`, `task.moved`, `comment.*` for this task update the drawer
- **States**: loading skeleton; task not found (toast, close drawer); comment composer validation
  error (empty or over 2000 chars); no comments ("No comments yet")

## comment-edit — Editing my own comment

- **Design**: `design/screens/comment-edit/screen.html`, `screen.png`
- **Entry**: "Edit" or "Delete" on a comment whose author is the selected user
- **Behavior**:
  - Edit: inline text area with counter `n / 2000`, "Save" → `PATCH /comments/:id`, "Cancel"
    restores the original text
  - Delete: confirmation popover "Delete this comment? This can't be undone." → `DELETE
    /comments/:id`; the comment disappears with no placeholder
  - Other users' comments show no actions; a `403` (e.g., stale UI) shows a toast and refreshes
    comments
  - Markup in comments renders as plain text

## not-found-toast — Not found message

- **Design**: `design/screens/not-found-toast/screen.html`, `screen.png`
- **Component**: `shared/ui/toast/` via `ToastService`
- **Triggers**: any `404 not_found` from a user action; a `comment.deleted` event for a comment being
  edited; a stale or edited task/project link
- **Behavior**: amber-edged glass toast in the bottom right with title and message, close button,
  auto-dismiss after 6 s, announced through an `aria-live="polite"` region; the affected view
  reloads
