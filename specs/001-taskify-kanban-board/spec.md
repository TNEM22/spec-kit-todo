# Feature Specification: Taskify Kanban Board

**Feature Branch**: `001-taskify-kanban-board`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Develop Taskify, a team productivity platform where predefined users create projects, assign tasks, comment, and move tasks across Kanban columns (To Do, In Progress, In Review, Done). Five users (one product manager, four engineers), three sample projects, no login for this first phase."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a user and work a project board (Priority: P1)

A team member opens Taskify and picks who they are from the five predefined users. They see the
list of projects, open one, and see its tasks laid out in four columns: To Do, In Progress,
In Review, and Done. They drag a task from one column to another to reflect its progress. Tasks
assigned to the current user are visually distinguished so they can find their own work at once.

**Why this priority**: Viewing and moving tasks across the board is the core of a Kanban tool.
With the sample data in place, this story alone is a usable, demonstrable product.

**Independent Test**: Start Taskify with the sample data, select a user, open a sample project,
move a task from To Do to In Progress, reload, and confirm the task is still in In Progress.

**Acceptance Scenarios**:

1. **Given** Taskify is opened with no user selected, **When** the visitor views the start screen,
   **Then** they see exactly five users, each with name and role, and no password prompt.
2. **Given** a user is selected, **When** they view the project list, **Then** they see the three
   sample projects (plus any projects created since).
3. **Given** a project is open, **When** the board loads, **Then** every task in the project appears
   in exactly one of the four columns, in the order To Do, In Progress, In Review, Done.
4. **Given** a task is in To Do, **When** the user drags it to In Review, **Then** it appears in
   In Review and stays there after the page is reloaded or another user views the board.
5. **Given** a user is selected, **When** they view a board, **Then** tasks assigned to them are
   visually distinct from tasks assigned to others or unassigned.
6. **Given** a user is selected, **When** they choose to switch user, **Then** they return to the
   user selection screen and can pick a different user.

---

### User Story 2 - Create and assign tasks (Priority: P2)

A user creates a new task in a project with a title and optional description, and assigns it to
one of the five users (or leaves it unassigned). They can later edit the task's details or change
its assignee.

**Why this priority**: Without creating and assigning tasks the board only shows sample data;
this makes Taskify useful for real work.

**Independent Test**: In a sample project, create a task titled "Write release notes", assign it to
an engineer, confirm it appears in To Do with that assignee, then reassign it and confirm the
change persists.

**Acceptance Scenarios**:

1. **Given** a project is open, **When** the user creates a task with a valid title, **Then** the
   task appears in the To Do column of that project.
2. **Given** a task exists, **When** the user assigns it to one of the five users, **Then** the
   assignee's name is shown on the task card and in the task details.
3. **Given** a task is assigned, **When** the user changes the assignee or clears it, **Then** the
   card reflects the new state.
4. **Given** the task form, **When** the user submits an empty title or a title over the length
   limit, **Then** the task is not created and a clear message explains why.
5. **Given** a task exists, **When** the user edits its title or description, **Then** the changes
   are saved and shown on the board.

---

### User Story 3 - Comment on tasks (Priority: P3)

A user opens a task and reads its comments in chronological order, each showing the author and time.
They add a comment of their own. They can edit or delete their own comments but not other users'.

**Why this priority**: Comments enable discussion on work items, but the board is usable without
them.

**Independent Test**: Open a task as one engineer, add a comment, confirm it shows that author;
switch to another user and confirm the comment is visible but cannot be edited or deleted by them.

**Acceptance Scenarios**:

1. **Given** a task is open, **When** the user adds a non-empty comment, **Then** it appears at the
   end of the comment list with the current user as author and the time it was posted.
2. **Given** a comment written by the current user, **When** they edit or delete it, **Then** the
   change is saved; edited comments are marked as edited.
3. **Given** a comment written by another user, **When** the current user views it, **Then** no edit
   or delete option is available, and any attempt to change it is rejected.
4. **Given** the comment form, **When** the user submits an empty or over-length comment, **Then**
   it is not saved and a clear message explains why.

---

### User Story 4 - Create projects (Priority: P4)

A user creates a new project with a name and optional description. The new project appears in the
project list for all users and opens to an empty board with the four standard columns.

**Why this priority**: Three sample projects cover the first phase's needs; creating more is
valuable but least critical.

**Independent Test**: Create a project named "Mobile App", confirm it appears in the project list
for every user and opens to an empty four-column board.

**Acceptance Scenarios**:

1. **Given** the project list, **When** the user creates a project with a valid, unique name,
   **Then** it appears in the list for all users with an empty board.
2. **Given** the project form, **When** the user submits an empty name, an over-length name, or a
   name already used by another project (ignoring letter case), **Then** the project is not created
   and a clear message explains why.

---

### Edge Cases

- A task is dropped back onto the column it came from: nothing changes and no error is shown.
- Two users move the same task at nearly the same time: the last move wins and every viewer sees
  the final column after refresh.
- A user selects a task that another user has just deleted or that no longer exists: a clear
  "not found" message is shown and the board refreshes.
- Input contains HTML, script, or other markup: it is stored and displayed as plain text, never
  interpreted.
- Input contains only whitespace: it is treated as empty and rejected.
- A request names a user, project, task, column, or comment that does not exist: it is rejected
  with a clear error and no data is changed.
- A project has no tasks: the board shows four empty columns with a prompt to create a task.
- Large boards (e.g., 200 tasks in one project) remain usable.

## Requirements *(mandatory)*

### Functional Requirements

**Users and identity**

- **FR-001**: System MUST provide exactly five predefined users: one Product Manager and four
  Engineers, each with a display name and role.
- **FR-002**: System MUST let a visitor select one of the predefined users without a password, and
  MUST show the selected user's name throughout the session.
- **FR-003**: System MUST let the current user switch to a different predefined user at any time.
- **FR-004**: System MUST NOT allow creating, editing, or deleting users in this phase.
- **FR-005**: System MUST require a selected user before any project, task, or comment can be
  viewed or changed.

**Projects**

- **FR-006**: System MUST be preloaded with three sample projects, each containing sample tasks
  spread across all four columns and assigned to a mix of users.
- **FR-007**: Users MUST be able to create a project with a name (1–100 characters, unique ignoring
  letter case) and an optional description (up to 1,000 characters).
- **FR-008**: System MUST show all projects to all users.

**Tasks and board**

- **FR-009**: Each project board MUST have exactly four columns, in this fixed order: To Do,
  In Progress, In Review, Done. Columns cannot be added, renamed, removed, or reordered.
- **FR-010**: Users MUST be able to create a task in a project with a title (1–200 characters) and
  an optional description (up to 5,000 characters). New tasks start in To Do.
- **FR-011**: Users MUST be able to edit a task's title and description, subject to the same limits.
- **FR-012**: Users MUST be able to assign a task to any one of the five users, or leave it
  unassigned. A task has at most one assignee.
- **FR-013**: Users MUST be able to move any task to any column by drag and drop, and MUST also have
  a non-drag way to change a task's column (e.g., for keyboard users).
- **FR-014**: System MUST visually distinguish tasks assigned to the current user from all others.
- **FR-015**: System MUST persist all changes to projects, tasks, assignments, columns, and comments
  so that they survive reloads and are visible to every user.
- **FR-016**: Each task card MUST show at least its title and assignee (or "Unassigned").

**Comments**

- **FR-017**: Users MUST be able to add a comment (1–2,000 characters) to any task. The comment
  records its author (the current user) and creation time.
- **FR-018**: System MUST show a task's comments in chronological order, oldest first, with author
  name and time.
- **FR-019**: Users MUST be able to edit and delete only their own comments. System MUST reject
  edits or deletions of another user's comment, including attempts that bypass the interface.
  Edited comments MUST be marked as edited.

**Validation and security**

- **FR-020**: System MUST validate every input on the server side against the limits above, trim
  leading and trailing whitespace, and reject invalid input with a clear message, without changing
  any stored data.
- **FR-021**: System MUST treat all user-entered text as plain text when displayed; markup and
  scripts MUST never be executed.
- **FR-022**: System MUST reject any request that references a non-existent or unknown user,
  project, task, column, or comment.
- **FR-023**: System MUST record an audit entry for each create, update, move, assignment, and
  delete, including which user performed it and when.
- **FR-024**: Error messages MUST NOT reveal internal details such as stack traces or system
  identifiers beyond what the user already sees.

### Key Entities

- **User**: One of five predefined team members. Has a display name and a role (Product Manager or
  Engineer). Fixed in this phase.
- **Project**: A container for tasks. Has a name, optional description, and creation time. Owns one
  board with the four fixed columns.
- **Task**: A unit of work within one project. Has a title, optional description, current column
  (status), optional assignee (a User), position within its column, and created/updated times.
- **Comment**: A message on a task. Has text, author (a User), creation time, and an edited marker.
- **Audit Entry**: A record of a change: who made it, what was changed, and when.

## Security Considerations

Required by Constitution Principle I.

- **Authentication (deliberate deviation for this phase)**: There is no login; anyone who can reach
  Taskify can act as any of the five users. User selection is an identity choice, not proof of
  identity. This is acceptable only because phase 1 is a demo with predefined users and sample
  data. Taskify MUST NOT be exposed to untrusted networks or hold real confidential data until
  authentication is added. The plan MUST record this deviation in its Constitution Check.
- **Authorization**: Even without login, the server MUST enforce the rules it can: a user may edit
  or delete only their own comments (FR-019), and every request MUST name a valid selected user
  (FR-005).
- **Input handling**: All input is validated server-side (FR-020) and displayed as plain text
  (FR-021) to prevent injection and cross-site scripting.
- **Abuse cases**: Impersonating another user is possible by design in this phase; the audit log
  (FR-023) records which selected user made each change.
- **Data exposure**: Only sample and team work data is stored; no personal data beyond display
  names and roles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can select a user, open a project, and move a task to a new
  column within 1 minute without instructions.
- **SC-002**: A user can create and assign a new task in under 30 seconds.
- **SC-003**: A moved task appears in its new column for the user who moved it within 1 second, and
  is visible to other users on their next refresh.
- **SC-004**: 100% of changes (task moves, edits, assignments, comments, new projects) are still
  present after reloading Taskify.
- **SC-005**: 100% of invalid inputs (empty, over-length, unknown references, markup) are rejected
  or rendered harmless, as verified by a test set covering every input field.
- **SC-006**: 0 cases in which a user can edit or delete another user's comment.
- **SC-007**: A board with 200 tasks loads and remains responsive to drag and drop for a single user.
- **SC-008**: In a walkthrough, all five sample users can each identify their own assigned tasks on
  a board at a glance.

## Assumptions

- Any of the five users (Product Manager or Engineer) can create projects, create, edit, assign,
  and move tasks; roles are informational only in this phase.
- Deleting projects and tasks is out of scope for this phase; only comments can be deleted (by
  their author).
- Users and their names are fixed sample data, e.g., one Product Manager and four Engineers with
  distinct names; exact names are chosen during planning.
- Sample tasks cover all four columns and include assigned and unassigned tasks.
- Task order within a column is kept when tasks are moved; precise reordering within a column is
  supported where drag and drop allows it.
- Real-time live updates are not required; other users see changes on refresh.
- Notifications, due dates, labels, attachments, search, and file uploads are out of scope.
- Taskify is used on desktop web browsers; mobile layout is out of scope for this phase.
- Authentication will be added in a later phase; this spec deliberately excludes it.
- Sample data is loaded once at first start and is not reset automatically.
