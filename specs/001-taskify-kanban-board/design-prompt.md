# Google Stitch Design Prompts: Taskify Kanban Board

**Source spec**: [spec.md](spec.md)
**Generated**: 2026-10-11
**Platform**: Web (desktop-first) — select Web mode in Stitch before pasting.

## How to use

1. Open https://stitch.withgoogle.com and start a new project in Web mode.
2. Paste Prompt 1 to establish the design system and the primary screen.
3. Paste each screen prompt in order, one at a time, in the same project.
4. Use the refinement prompts afterwards, one change per message.
5. When you are happy with the result, download all frames as a .zip, place it in this folder, and
   run `/speckit-design-import`.

## Design System

Requested direction: eye-catching yet soothing, fluid glass effect, dark mode only (no light theme).

- **Vibe**: calm, luminous, focused, premium; soft light glowing through frosted glass at night.
- **Theme**: dark only. App background deep midnight `#0B1020` with three large, very blurred,
  slowly blended aurora shapes behind the content: teal `#2DD4BF`, indigo `#6366F1`, violet
  `#8B5CF6`, each at about 25% opacity.
- **Glass surfaces** (panels, columns, cards, modals, drawer): frosted fill of white at 8% opacity
  with strong background blur, 1px border of white at 14% opacity, a faint lighter highlight along
  the top edge, and a soft dark shadow. Text never sits directly on the aurora; it sits on glass that
  is dense enough for WCAG AA contrast.
- **Primary accent**: soft teal `#5EEAD4` (primary buttons with dark `#0B1020` text, focus rings,
  "my task" highlight). **Secondary accent**: lavender `#A5B4FC` (links, secondary emphasis).
- **Text**: primary `#E6E9F2`, secondary `#A3ACC2`. Dividers and disabled elements `#6B7491`
  (never used for readable text).
- **Column colors** (header dot, thin top glow line, status chip): To Do `#94A3B8` slate,
  In Progress `#7DD3FC` sky, In Review `#FCD34D` soft amber, Done `#86EFAC` mint.
- **Feedback**: error text `#FCA5A5` with border `#F87171`; success `#86EFAC`.
- **Avatars**: initials in `#0B1020` on a filled circle. Alex Morgan `#C4B5FD`, Sam Lee `#5EEAD4`,
  Jordan Patel `#F9A8D4`, Riley Chen `#FDBA74`, Taylor Brooks `#93C5FD`. Unassigned: dashed
  outline circle `#6B7491` with a small person icon.
- **Font**: Plus Jakarta Sans. Headings semibold, body regular 14–15px.
- **Corner radius**: cards 16px, columns and panels 20px, modals and drawer 24px, buttons and chips
  fully rounded (pill).
- **Spacing and density**: comfortable, 8px grid, generous whitespace.
- **Iconography**: thin rounded line icons, 1.5px stroke.
- **"My task" treatment**: 3px teal `#5EEAD4` glowing left edge, slightly brighter glass, and a small
  "You" chip, so it never relies on color alone.

## Screen Inventory

| # | Screen | Purpose | User Story | Priority |
|---|--------|---------|------------|----------|
| 1 | Project board | Four-column Kanban board; drag tasks; spot my tasks | US1 | P1 |
| 2 | User selection | Pick one of the five users, no password | US1 | P1 |
| 3 | Project list | Browse projects and open one | US1 (create: US4) | P1 |
| 4 | New task modal | Create a task with title, description, assignee | US2 | P2 |
| 5 | Task detail drawer | Edit task, assign, change column, read and add comments | US2, US3 | P2 |
| 6 | New project modal | Create a project with name and description | US4 | P4 |

## Prompt 1 — App overview + Project board

```text
Design Taskify, a team Kanban web app for a five-person team (one product manager, four engineers). Desktop web, dark mode only. Vibe: calm, luminous, eye-catching yet soothing, like soft light behind frosted glass at night. Background deep midnight #0B1020 with large, very blurred aurora shapes in teal #2DD4BF, indigo #6366F1 and violet #8B5CF6 at low opacity. All surfaces are fluid frosted glass: white at 8% opacity, strong background blur, 1px border white at 14%, faint top highlight, soft shadow. Text #E6E9F2, secondary #A3ACC2. Accent teal #5EEAD4. Font Plus Jakarta Sans. Radius 16px cards, 20px columns, pill buttons. Thin line icons.

Screen: the project board. Top: a glass navigation bar with the Taskify wordmark on the left, breadcrumb "Projects / Customer Portal", and on the right a user chip with a teal avatar "SL", "Sam Lee · Engineer" and a "Switch user" text button. Below: the project title "Customer Portal", a one-line description, and a teal pill primary button "New task".

Main area: four equal glass columns in this order with a colored dot, title and count badge: To Do (#94A3B8), In Progress (#7DD3FC), In Review (#FCD34D), Done (#86EFAC), each with a thin glowing top line in its color.

Task cards are glass with title and an assignee avatar plus name. To Do: "Add CSV export to reports" (Unassigned, dashed avatar), "Write release notes" (Taylor Brooks). In Progress: "Build account settings page" (Sam Lee), "Fix date format on invoices" (Riley Chen). In Review: "Update onboarding checklist copy" (Alex Morgan), "Refactor search filters" (Sam Lee). Done: "Set up error monitoring" (Jordan Patel), "Accessibility audit for dashboard" (Riley Chen).

Cards assigned to Sam Lee have a 3px glowing teal left edge, slightly brighter glass and a small "You" chip. Show "Fix date format on invoices" mid-drag: lifted, tilted 2 degrees, deeper shadow, over In Review, whose drop slot shows a dashed teal outline glow.
```

## Prompt 2 — User selection

```text
Using the same dark fluid-glass design system as the board screen (midnight #0B1020 background with blurred teal, indigo and violet aurora, frosted glass surfaces, teal accent #5EEAD4, Plus Jakarta Sans), design the start screen where a visitor picks who they are. There is no login, no password field, and no sign-up.

Centered on the screen: the Taskify wordmark, the heading "Who's working today?" and a short secondary line "Pick your name to continue." Below, a row of five large glass cards, evenly spaced, each with a big avatar circle with initials, the person's name, and a role chip:
Alex Morgan, Product Manager (avatar #C4B5FD, "AM");
Sam Lee, Engineer (avatar #5EEAD4, "SL");
Jordan Patel, Engineer (avatar #F9A8D4, "JP");
Riley Chen, Engineer (avatar #FDBA74, "RC");
Taylor Brooks, Engineer (avatar #93C5FD, "TB").

Show the Sam Lee card in a hover/focus state: brighter glass, a 2px teal #5EEAD4 focus ring with soft glow, and slightly raised. The Product Manager role chip is lavender #A5B4FC; Engineer chips are neutral glass. At the bottom, a small muted note: "Phase 1 demo. Anyone can choose any user." Keep the screen calm, spacious and softly glowing.
```

## Prompt 3 — Project list

```text
Using the same dark fluid-glass design system as the previous screens, design the project list screen that appears after choosing a user.

Top: the same glass navigation bar with the Taskify wordmark on the left, the breadcrumb "Projects", and on the right the user chip with avatar "SL", "Sam Lee · Engineer" and a "Switch user" text button.

Below the bar: the heading "Projects", the secondary line "3 projects", and on the right a teal pill primary button "New project" (#5EEAD4 with dark #0B1020 text).

Main area: a grid of three large glass project cards. Each card shows the project name, a two-line description, a thin segmented progress bar using the column colors (To Do #94A3B8, In Progress #7DD3FC, In Review #FCD34D, Done #86EFAC) with task counts per column underneath, a small stack of assignee avatars, and an "Open board" link with an arrow in lavender #A5B4FC.
Card 1: "Customer Portal" — "Self-service portal where customers manage accounts and invoices." 2 / 2 / 2 / 2 tasks. Show a badge "2 assigned to you".
Card 2: "Billing Revamp" — "Simplify invoicing and payment reminders." 4 / 1 / 1 / 3 tasks.
Card 3: "Internal Tools" — "Small utilities that speed up the team's daily work." 2 / 2 / 0 / 4 tasks.

Show the Customer Portal card in hover state with brighter glass and a soft teal glow.
```

## Prompt 4 — New task modal

```text
Using the same dark fluid-glass design system, design the "New task" modal opened from the Customer Portal board. Show the board behind it dimmed and blurred.

The modal is a centered glass panel, 560px wide, 24px radius, with the title "New task" and a close icon button top right, and a small secondary line "Customer Portal · will be added to To Do".

Fields, top to bottom, each with a visible label:
"Title" (required) text field filled with "Write release notes", with a character counter "19 / 200" below on the right.
"Description" (optional) multi-line text area with "Summarize the changes shipping in version 2.4 for customers." and a counter "62 / 5000".
"Assignee" dropdown showing the selected value "Taylor Brooks" with a blue #93C5FD avatar "TB". Show the dropdown open below it as a glass list with all five users (each with avatar, name and role) plus an "Unassigned" option at the top with a dashed avatar; Taylor Brooks has a teal check mark.

Fields are dark glass inputs with a 1px white-14% border; the focused field has a 2px teal #5EEAD4 ring. Footer, right-aligned: a ghost "Cancel" button and a teal pill primary button "Create task" with dark #0B1020 text.
```

## Prompt 5 — Task detail drawer

```text
Using the same dark fluid-glass design system, design the task detail drawer that slides in from the right over the Customer Portal board (board visible but dimmed and blurred on the left). The drawer is a tall glass panel about 480px wide with a 24px radius on its left corners.

Header: a status chip "In Progress" with a sky #7DD3FC dot, the task title "Build account settings page" as an editable heading with a small pencil icon, and a close icon button. Below: "Created Oct 8 · Updated Oct 10" in secondary text.

Details section: "Status" dropdown showing "In Progress" (this is the keyboard-friendly way to move a task between To Do, In Progress, In Review and Done); "Assignee" dropdown showing Sam Lee with teal avatar "SL" and a "You" chip; "Description" text block: "Let users update their display name, email preferences and time zone."

Comments section titled "Comments · 3", oldest first. Each comment has an avatar, author name, time, and text on a soft glass bubble:
Alex Morgan, Oct 9, 10:14: "Please match the layout of the billing settings page."
Riley Chen, Oct 9, 15:40: "Time zone list is ready in the shared components."
Sam Lee (you), Oct 10, 09:02, marked "edited": "Started on the form; validation next." Only this comment shows small "Edit" and "Delete" text buttons; the others show no actions.

Bottom: a pinned glass composer with a multi-line field "Add a comment…", a counter "0 / 2000", and a teal pill "Post" button.
```

## Prompt 6 — New project modal

```text
Using the same dark fluid-glass design system, design the "New project" modal opened from the project list. Show the project list behind it dimmed and blurred.

The modal is a centered glass panel, 520px wide, 24px radius, titled "New project" with a close icon button, and a secondary line "Everyone on the team will see this project."

Fields with visible labels:
"Project name" (required) text field filled with "Mobile App", counter "10 / 100".
"Description" (optional) text area with "Companion app for checking tasks on the go.", counter "44 / 1000".

Below the fields, a small preview row showing four mini column chips that the new board will start with: To Do (#94A3B8), In Progress (#7DD3FC), In Review (#FCD34D), Done (#86EFAC), with the note "Every project uses these four columns."

Footer, right-aligned: ghost "Cancel" button and teal #5EEAD4 pill primary button "Create project" with dark #0B1020 text. The name field shows the focused state with a 2px teal ring and soft glow.
```

## State Prompts

### S1 — Empty board (new project)

```text
Using the same dark fluid-glass design system, design the board for a brand-new project "Mobile App" with no tasks. Same navigation bar (breadcrumb "Projects / Mobile App", user chip "Sam Lee · Engineer"), the title "Mobile App", the description "Companion app for checking tasks on the go." and the teal "New task" button.

Show the four glass columns To Do, In Progress, In Review and Done with their colored dots and glowing top lines, each with a count badge "0". The columns are empty with a faint dashed inner outline. In the To Do column, centered, a calm empty state: a soft glowing line illustration of a sticky note, the text "No tasks yet", the secondary text "Create the first task to get started.", and a teal pill button "New task". The other three columns show only a small muted line "Nothing here yet".
```

### S2 — New task validation error

```text
Using the same dark fluid-glass design system, show the "New task" modal from earlier in an error state after the user pressed "Create task" with only spaces in the title.

The "Title" field is empty, has a 1px #F87171 border and soft red glow, and below it an error message in #FCA5A5 with a small alert icon: "Title is required. Enter 1 to 200 characters." The counter reads "0 / 200". The description field is empty and normal. Assignee shows "Unassigned" with a dashed avatar.

At the top of the modal body, a slim glass alert banner with a red-tinted left edge: "The task wasn't created. Fix the highlighted field." The "Create task" button stays enabled. Keep the error calm and readable, not alarming.
```

### S3 — New project duplicate name

```text
Using the same dark fluid-glass design system, show the "New project" modal in an error state. The "Project name" field contains "customer portal" with a 1px #F87171 border and soft red glow. Below it, in #FCA5A5 with an alert icon: "A project named "Customer Portal" already exists. Choose a different name." The counter reads "15 / 100". The description field is empty. Footer with ghost "Cancel" and teal pill "Create project" buttons.
```

### S4 — Editing my own comment

```text
Using the same dark fluid-glass design system, show the task detail drawer for "Build account settings page" with Sam Lee editing their own comment.

The comments list shows Alex Morgan's and Riley Chen's comments as before with no actions. Sam Lee's comment bubble is in edit mode: an inline text area with a 2px teal #5EEAD4 focus ring containing "Started on the form; validation and time zone picker next.", a counter "57 / 2000", and two small buttons "Cancel" (ghost) and "Save" (teal pill).

Add a fourth comment from Jordan Patel, Oct 10, 11:20, whose text shows markup literally as plain text: "Can we keep the <b>Save</b> button sticky?" It has no edit or delete actions. Above the composer, show a small inline confirmation popover for a delete action: "Delete this comment? This can't be undone." with "Cancel" and a soft red "Delete" button.
```

### S5 — Not found message

```text
Using the same dark fluid-glass design system, show the Customer Portal board with a glass toast notification in the bottom right corner. The toast has a soft amber #FCD34D left edge, an info icon, the title "That comment no longer exists", the text "Its author deleted it. The view has been refreshed.", and a close icon. The task detail drawer for "Build account settings page" is open on the right, showing two comments, without the deleted one. Everything else is the same as the board screen.
```

### S6 — Board loading

```text
Using the same dark fluid-glass design system, show the Customer Portal board while it loads. The navigation bar, project title and "New task" button are visible. Each of the four columns (To Do, In Progress, In Review, Done, with colored dots) shows three skeleton cards: glass rectangles with softly shimmering lighter bars for the title and a circle for the avatar. Count badges show a small skeleton pill instead of a number. Calm and subtle, no spinner.
```

### S7 — Keyboard "Move to" menu

```text
Using the same dark fluid-glass design system, show the Customer Portal board with the card "Write release notes" (To Do, Taylor Brooks) focused by keyboard: a 2px teal #5EEAD4 focus ring with soft glow. A small "more" icon button on the card is active and opens a glass context menu titled "Move to" listing In Progress (sky #7DD3FC dot), In Review (amber #FCD34D dot) and Done (mint #86EFAC dot); To Do is shown with a check and labelled "Current". The "In Review" item is highlighted. Show a keyboard hint at the bottom of the menu: "↑ ↓ to choose · Enter to move".
```

## Refinement Prompts

```text
On every screen, increase the glass opacity behind all text to about 14% and slightly darken the aurora under text-heavy areas so all body text meets at least 4.5:1 contrast against its background.
```

```text
On the board screen, make cards assigned to the current user stand out more: keep the teal left edge, make the "You" chip a filled teal #5EEAD4 pill with dark #0B1020 text, and make all other cards' glass slightly dimmer.
```

```text
On the board screen, make each column's count badge a small glass pill in secondary text #A3ACC2 next to the column title, and align all column headers on one baseline.
```

```text
On the board screen, add a card with a very long title, "Investigate intermittent timeout when exporting large customer invoice histories to CSV for enterprise accounts", and clamp card titles to two lines with an ellipsis.
```

```text
Across all screens, make keyboard focus clearly visible: every focusable element gets a 2px teal #5EEAD4 ring with a 2px dark gap, never only a color change.
```

```text
Show the board screen at a narrow 1024px desktop window: keep all four columns visible with a horizontal scroll and snap, and make the navigation bar hide the role text, showing only the avatar and "Switch user".
```

```text
Make the background aurora softer and slower-feeling on all screens: reduce each glow to about 18% opacity and increase the blur, so the screens feel more soothing and less busy.
```

```text
Make the navigation bar identical on the board, project list and empty board screens: same height, same wordmark size, same user chip and "Switch user" button position.
```

## Out of Scope (do not design)

- Login, sign-up, password, or "forgot password" screens.
- Light or white theme (dark mode only, by request).
- Creating, editing, or deleting users; profile or settings pages.
- Deleting projects or tasks (only comments can be deleted).
- Adding, renaming, removing, or reordering columns.
- An audit log screen (maintainers only in this phase).
- Notifications, due dates, labels, attachments, search, file uploads.
- Live presence indicators or real-time cursors (changes appear on refresh).
- Mobile phone layouts.

## Assumptions

- Platform is desktop web (spec: desktop browsers only); a narrow 1024px window is the smallest
  layout designed.
- Sample names are invented: Alex Morgan (Product Manager); Sam Lee, Jordan Patel, Riley Chen and
  Taylor Brooks (Engineers). Sam Lee is the "current user" in all mockups.
- Sample projects are invented: Customer Portal, Billing Revamp, Internal Tools; sample task titles
  and comments are invented to fill the board.
- "Fluid glass" is interpreted as frosted, translucent glass panels over a softly blurred aurora
  gradient; "soothing" as low-saturation pastel accents on deep navy with generous spacing.
- Colors, font (Plus Jakarta Sans), corner radii, and spacing are design choices, not spec
  requirements, and can be changed.
- The task detail opens as a right-side drawer over the board; new task and new project open as
  centered modals.
- The non-drag way to move a task (FR-013) is shown twice: the Status dropdown in the drawer and a
  "Move to" menu on the card.
- Deleting a comment asks for confirmation; the spec does not require it, but it prevents mistakes.
- Project cards show a per-column progress bar and a "assigned to you" badge as helpful summaries.
