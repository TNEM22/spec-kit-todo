# Design Manifest: Taskify Kanban Board

**Prompts**: ../design-prompt.md
**Stitch Project**: —
**Imported Zips**: stitch_taskify_aurora_kanban_board.zip (49bdfe55)

| # | Slug | Screen | Prompt | User Story | Status | Design Files | Implemented In |
|---|------|--------|--------|------------|--------|--------------|----------------|
| 1 | board | Project board | Prompt 1 | US1 (P1) | generated | screens/board/screen.html, screens/board/screen.png, variants: screens/board/variants/1 (long title), screens/board/variants/2 (1024px) | — |
| 2 | user-select | User selection | Prompt 2 | US1 (P1) | generated | screens/user-select/screen.html, screens/user-select/screen.png | — |
| 3 | projects | Project list | Prompt 3 | US1 (P1), US4 (P4) | generated | screens/projects/screen.html, screens/projects/screen.png (image empty in export) | — |
| 4 | task-create | New task modal | Prompt 4 | US2 (P2) | generated | screens/task-create/screen.html, screens/task-create/screen.png | — |
| 5 | task-detail | Task detail drawer | Prompt 5 | US2 (P2), US3 (P3) | generated | screens/task-detail/screen.html, screens/task-detail/screen.png | — |
| 6 | project-create | New project modal | Prompt 6 | US4 (P4) | generated | screens/project-create/screen.html, screens/project-create/screen.png | — |
| 7 | board-empty | Empty board (new project) | S1 | US4 (P4) | generated | screens/board-empty/screen.html, screens/board-empty/screen.png (image empty in export) | — |
| 8 | task-create-error | New task validation error | S2 | US2 (P2) | generated | screens/task-create-error/screen.html, screens/task-create-error/screen.png | — |
| 9 | project-create-error | New project duplicate name | S3 | US4 (P4) | generated | screens/project-create-error/screen.html, screens/project-create-error/screen.png | — |
| 10 | comment-edit | Editing my own comment | S4 | US3 (P3) | generated | screens/comment-edit/screen.html, screens/comment-edit/screen.png | — |
| 11 | not-found-toast | Not found message | S5 | US1 (P1), US3 (P3) | generated | screens/not-found-toast/screen.html, screens/not-found-toast/screen.png | — |
| 12 | board-loading | Board loading | S6 | US1 (P1) | generated | screens/board-loading/screen.html, screens/board-loading/screen.png | — |
| 13 | card-move-menu | Keyboard "Move to" menu | S7 | US1 (P1) | generated | screens/card-move-menu/screen.html, screens/card-move-menu/screen.png | — |

**Notes**: Stitch added out-of-scope elements (search, notifications, analytics tabs, tags, due
dates, ticket IDs, etc.) to most screens; see "Out-of-scope elements" in `tokens.md`. Do not build
them.
