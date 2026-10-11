# Feature Specification: Taskify Kanban Board

**Feature Branch**: `001-taskify-kanban-board`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Develop Taskify, a team productivity platform where predefined users create projects, assign tasks, comment, and move tasks across Kanban columns (To Do, In Progress, In Review, Done). Five users (one product manager, four engineers), three sample projects, no login for this first phase."

## Clarifications

### Session 2026-10-11

- Q: Who should be allowed to move a task between columns? → A: Anyone can move any task to any
  column; no role, assignee, or column-order restrictions.
- Q: Should the Product Manager be able to delete other users' comments? → A: No. Only a comment's
  author can edit or delete it, with no exceptions for any role.
- Q: Who can assign a task, and to whom? → A: Any user can assign any task to any of the five users
  (including themselves), change the assignee, or clear it. (Recommended default, accepted by user
  delegation.)
- Q: What happens to a deleted comment, and is there a time limit on editing or deleting? → A: It is
  removed from the task for all users with no placeholder; the audit log keeps the record. Authors
  can edit or delete their comments at any time. (Recommended default, accepted by user delegation.)
- Q: Where does a task land in its column when created or moved? → A: New tasks go to the bottom of
  To Do; a dragged task lands where it is dropped; a task moved without dragging goes to the bottom
  of the target column. (Recommended default, accepted by user delegation.)
- Q: Should Taskify remember the selected user across page reloads and browser restarts? → A: It is
  remembered until the browser tab or window is closed; reloads keep it, a new browser session
  returns to user selection. (Recommended default, accepted by user delegation.)
- Q: Can users view the audit log inside Taskify? → A: No. In this phase the audit log is recorded
  for maintainers only; there is no audit screen. (Recommended default, accepted by user delegation.)
- Q: What accessibility level must Taskify meet? → A: WCAG 2.1 Level AA for all screens in this
  phase. (Recommended default, accepted by user delegation.)
- Q: What happens when two users edit the same task's details at nearly the same time? → A: The last
  save wins, the same rule as for moves; no merge or conflict warning in this phase. (Recommended
  default, accepted by user delegation.)
- Q: Are notifications part of this phase? → A: Yes, in-app notifications only (revised; an
  earlier answer in this session excluded them). Email and other outside channels stay out of scope.
  Live board updates and notifications are separate: both are delivered live.
- Q: Which events create a notification for a user? → A: A task is assigned to them; someone
  comments on a task assigned to them; someone else moves a task assigned to them to another column.
  Nobody is notified about their own actions. (Recommended default, accepted by user delegation.)
- Q: Where do users see notifications? → A: A bell in the top navigation bar with an unread count;
  it opens a panel listing notifications newest first. Opening a notification goes to its task and
  marks it read; "Mark all as read" clears the count. No pop-up toasts for notifications.
  (Recommended default, accepted by user delegation.)
- Q: How long are notifications kept, and can they be deleted? → A: The 100 most recent per user are
  kept; older ones are removed automatically. Users can mark them read but not delete them.
  (Recommended default, accepted by user delegation.)
- Q: Who can see a notification, and how fast must it arrive? → A: Only its recipient; it appears
  within 2 seconds while the recipient has Taskify open, and otherwise on their next visit.
  (Recommended default, accepted by user delegation.)
- Q: Should Taskify be built as separate services or as one application in this phase? → A: One
  application (a monolith) in this phase, structured by domain so parts can be separated later.
- Q: Do other users see changes live, or only after refreshing? → A: Live. Changes appear for every
  user viewing the affected board or task without a refresh. (Derived from the user's planning
  input; aligns the spec with the planned real-time updates.)

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
   change is saved; edited comments are marked as edited, and deleted comments disappear from the
   task for all users.
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

### User Story 5 - Notifications (Priority: P5)

A user sees a bell with an unread count in the top navigation bar. Opening it shows notifications
about their own work: a task assigned to them, a comment on a task assigned to them, or someone else
moving a task assigned to them. Selecting a notification opens that task and marks it read.

**Why this priority**: Notifications help people notice changes to their work, but the board,
tasks and comments are fully usable without them.

**Independent Test**: As Alex Morgan, assign a task to Sam Lee; with Sam Lee's view open in another
window, confirm Sam's bell count increases within 2 seconds, open the notification, land on the task,
and confirm the count drops.

**Acceptance Scenarios**:

1. **Given** Sam Lee has Taskify open, **When** another user assigns a task to Sam, comments on a
   task assigned to Sam, or moves a task assigned to Sam to another column, **Then** Sam's unread
   count increases within 2 seconds without a refresh.
2. **Given** a user acts on their own task (e.g., assigns it to themselves or comments on it),
   **When** the action completes, **Then** no notification is created for them.
3. **Given** a user has unread notifications, **When** they open the bell, **Then** they see the
   newest first, each with who did what, on which task, and when; unread ones are marked.
4. **Given** the notification panel is open, **When** the user selects a notification, **Then** its
   task opens and the notification becomes read; **When** they choose "Mark all as read", **Then**
   the unread count becomes 0.
5. **Given** Sam Lee was offline when notified, **When** Sam next selects their user, **Then** the
   unread notifications are shown.

---

### Edge Cases

- A task is dropped back onto the column it came from: nothing changes and no error is shown.
- Two users move the same task at nearly the same time: the last move wins and every viewer sees
  the final column without refreshing.
- Two users edit the same task's title, description, or assignee at nearly the same time: the last
  save wins, with no merge or conflict warning.
- A user acts on a comment its author has just deleted, or opens a task or project that does not
  exist (e.g., from a stale or edited link): a clear "not found" message is shown and the view
  refreshes.
- Input contains HTML, script, or other markup: it is stored and displayed as plain text, never
  interpreted.
- Input contains only whitespace: it is treated as empty and rejected.
- A request names a user, project, task, column, or comment that does not exist: it is rejected
  with a clear error and no data is changed.
- A project has no tasks: the board shows four empty columns with a prompt to create a task.
- A project has 200 tasks: the board meets the responsiveness target in SC-007.
- A notification refers to a comment that was later deleted: the notification stays and opens the
  task; the deleted comment is not shown.
- A task is assigned to someone and quickly reassigned: each assignment notifies its new assignee;
  earlier notifications are not withdrawn.
- A user has more than 100 notifications: the oldest are removed so 100 remain.
- A user has no notifications: the panel shows "You're all caught up".

## Requirements *(mandatory)*

### Functional Requirements

**Users and identity**

- **FR-001**: System MUST provide exactly five predefined users: one Product Manager and four
  Engineers, each with a display name and role.
- **FR-002**: System MUST let a visitor select one of the predefined users without a password, and
  MUST show the selected user's name throughout the session. The selection MUST be kept across page
  reloads and cleared when the browser tab or window is closed.
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
  an optional description (up to 5,000 characters). New tasks are added at the bottom of To Do.
- **FR-011**: Users MUST be able to edit a task's title and description, subject to the same limits.
- **FR-012**: Any user MUST be able to assign any task to any one of the five users (including
  themselves), change its assignee, or clear it to Unassigned. A task has at most one assignee.
- **FR-013**: Any user, regardless of role or assignee, MUST be able to move any task from any column
  to any other column, forward or backward and skipping columns, by drag and drop. Users MUST also
  have a non-drag way to change a task's column (e.g., for keyboard users). A dragged task is placed
  where it is dropped, including reordering within the same column; a task moved without dragging
  is placed at the bottom of the target column.
- **FR-014**: System MUST visually distinguish tasks assigned to the current user from all others.
- **FR-015**: System MUST persist all changes to projects, tasks, assignments, columns, and comments
  so that they survive reloads and are visible to every user. Changes MUST appear for other users
  viewing the affected board or task without a refresh; after a lost connection is restored, the
  open view MUST reload so no change is missed.
- **FR-016**: Each task card MUST show at least its title and assignee (or "Unassigned").

**Comments**

- **FR-017**: Users MUST be able to add a comment (1–2,000 characters) to any task. The comment
  records its author (the current user) and creation time.
- **FR-018**: System MUST show a task's comments in chronological order, oldest first, with author
  name and time.
- **FR-019**: Only a comment's author MUST be able to edit or delete it, at any time; no role,
  including the Product Manager, is exempt. System MUST reject edits or deletions of another user's
  comment, including attempts that bypass the interface. Edited comments MUST be marked as edited.
  Deleted comments MUST be removed from the task for all users, with no placeholder.

**Validation and security**

- **FR-020**: System MUST validate every input on the server side against the limits above, trim
  leading and trailing whitespace, and reject invalid input with a clear message, without changing
  any stored data.
- **FR-021**: System MUST treat all user-entered text as plain text when displayed; markup and
  scripts MUST never be executed.
- **FR-022**: System MUST reject any request that references a non-existent or unknown user,
  project, task, column, or comment.
- **FR-023**: System MUST record an audit entry for each create, update, move, assignment, and
  delete, including which user performed it and when. The audit log is available to maintainers
  only; it is not viewable in the app in this phase.
- **FR-024**: Error messages MUST NOT reveal internal details such as stack traces or system
  identifiers beyond what the user already sees.

**Accessibility**

- **FR-025**: All screens MUST meet WCAG 2.1 Level AA. Every action, including moving tasks, MUST be
  possible with a keyboard alone, and the highlight for the current user's tasks MUST NOT rely on
  color alone.

**Notifications**

- **FR-026**: System MUST create a notification for a user when another user (a) assigns a task to
  them, (b) comments on a task assigned to them, or (c) moves a task assigned to them to a different
  column. System MUST NOT create a notification for a user's own actions or for reordering within
  the same column.
- **FR-027**: Each notification MUST record its recipient, the user who caused it, the event type,
  the task (and project) it concerns, its creation time, and whether it has been read.
- **FR-028**: System MUST show a bell in the top navigation bar with the current user's unread
  count, and a panel listing their notifications newest first. Selecting a notification MUST open
  its task and mark it read; users MUST be able to mark all as read. Users cannot delete
  notifications.
- **FR-029**: A notification MUST reach its recipient within 2 seconds while they have Taskify open,
  without a refresh, and MUST be listed on their next visit otherwise. Notifications are separate
  from the live board updates in FR-015.
- **FR-030**: System MUST keep the 100 most recent notifications per user and remove older ones
  automatically.
- **FR-031**: System MUST show and deliver each notification only to its recipient, and MUST reject
  any attempt to read or mark another user's notifications.

### Key Entities

- **User**: One of five predefined team members. Has a display name and a role (Product Manager or
  Engineer). Fixed in this phase.
- **Project**: A container for tasks. Has a name, optional description, and creation time. Owns one
  board with the four fixed columns.
- **Task**: A unit of work within one project. Has a title, optional description, current column
  (status), optional assignee (a User), position within its column, and created/updated times.
- **Comment**: A message on a task. Has text, author (a User), creation time, and an edited marker.
- **Audit Entry**: A record of a change: who made it, what was changed, and when.
- **Notification**: A message to one user about a change to their work. Has recipient (a User),
  actor (a User), event type (assigned, commented, moved), the task and project concerned, creation
  time, and read state.

## Security Considerations

Required by Constitution Principle I.

- **Authentication (deliberate deviation for this phase)**: There is no login; anyone who can reach
  Taskify can act as any of the five users. User selection is an identity choice, not proof of
  identity. This is acceptable only because phase 1 is a demo with predefined users and sample
  data. Taskify MUST NOT be exposed to untrusted networks or hold real confidential data until
  authentication is added. The plan MUST record this deviation in its Constitution Check.
- **Authorization**: Even without login, the server MUST enforce the rules it can: a user may edit
  or delete only their own comments (FR-019), users see and change only their own notifications
  (FR-031), and every request MUST name a valid selected user (FR-005).
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
  appears for other users viewing the same board within 2 seconds, without a refresh.
- **SC-004**: 100% of changes (task moves, edits, assignments, comments, new projects) are still
  present after reloading Taskify.
- **SC-005**: 100% of invalid inputs (empty, over-length, unknown references, markup) are rejected
  or rendered harmless, as verified by a test set covering every input field.
- **SC-006**: 0 cases in which a user can edit or delete another user's comment.
- **SC-007**: A board with 200 tasks loads within 3 seconds, and a dropped task shows in its new
  position within 1 second.
- **SC-008**: In a walkthrough, all five sample users can each identify their own assigned tasks on
  a board at a glance.
- **SC-009**: A notification appears in its recipient's unread count within 2 seconds while they
  have Taskify open.
- **SC-010**: 0 notifications are created for a user's own actions, and 0 notifications are shown to
  anyone other than their recipient.

## Assumptions

- Any of the five users (Product Manager or Engineer) can create projects, create, edit, assign,
  and move tasks; roles are informational only in this phase.
- Deleting projects and tasks is out of scope for this phase; only comments can be deleted (by
  their author).
- Users and their names are fixed sample data, e.g., one Product Manager and four Engineers with
  distinct names; exact names are chosen during planning.
- Sample tasks cover all four columns and include assigned and unassigned tasks.
- Changes are shown live to other users viewing the same board or task; presence indicators (who
  else is viewing) are out of scope.
- Notifications are in-app only; email, push, and other outside channels, notification settings,
  and pop-up alerts are out of scope. Due dates, labels, attachments, search, and file uploads are
  also out of scope for this phase.
- Taskify is built as a single application (monolith) in this phase, organized by domain (users,
  projects, tasks, comments, notifications, audit) so domains can be separated later.
- Taskify is used on desktop web browsers; mobile layout is out of scope for this phase.
- Authentication will be added in a later phase; this spec deliberately excludes it.
- Sample data is loaded once at first start and is not reset automatically.
