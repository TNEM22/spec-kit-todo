# Design Tokens: Taskify Kanban Board

**Source**: Stitch export `stitch_taskify_aurora_kanban_board.zip` (49bdfe55), 13 screens in
`screens/*/screen.html`, plus Stitch's design-system note
`imports/stitch_taskify_aurora_kanban_board-49bdfe55/stitch_taskify_aurora_kanban_board/nocturne_glass/DESIGN.md`
("Nocturne Glass").
**Extracted**: 2026-10-11

The Stitch output is the reference for implementation. Counts are occurrences across the 13 primary
screens and show which values are actually used.

## Colors — app palette (used directly)

| Name | Value | Where used |
|------|-------|-----------|
| canvas | `#0B1020` | Page background behind the aurora (98) |
| accent / primary-container | `#5EEAD4` | Primary buttons, focus rings, "You" chip, my-task edge, drop zone (208) |
| accent-on | `#0B1020` | Text on teal buttons and chips |
| text-primary | `#E6E9F2` | Headings, card titles, body text (164) |
| text-secondary | `#A3ACC2` | Metadata, descriptions, placeholders (198) |
| secondary-accent | `#A5B4FC` | Links ("Open board"), Product Manager chip (16) |
| aurora-teal | `#2DD4BF` | Background glow (23) |
| aurora-indigo | `#6366F1` | Background glow (24) |
| aurora-violet | `#8B5CF6` | Background glow (21) |
| status-todo | `#94A3B8` | To Do dot, top line, chips (31) |
| status-in-progress | `#7DD3FC` | In Progress dot, glow `0 0 8px`, chips (72) |
| status-in-review | `#FCD34D` | In Review dot, glow, toast edge (47) |
| status-done | `#86EFAC` | Done dot, glow, success (69) |
| error-text | `#FCA5A5` | Validation messages (2) |
| error-border | `#F87171` | Invalid field border, delete button (7) |
| avatar-alex | `#C4B5FD` | Alex Morgan (13) |
| avatar-sam | `#5EEAD4` | Sam Lee |
| avatar-jordan | `#F9A8D4` | Jordan Patel (4) |
| avatar-riley | `#FDBA74` | Riley Chen (6) |
| avatar-taylor | `#93C5FD` | Taylor Brooks (8) |

## Colors — Stitch theme tokens (Tailwind config, Material-style)

Each screen also ships a generated theme. Its main roles:

| Name | Value | Where used |
|------|-------|-----------|
| background / surface | `#0E1323` | Body background in the theme (57) |
| surface-container-lowest | `#080D1D` | Deepest panels (24) |
| surface-container-low | `#161B2B` | Panels (23) |
| surface-container | `#1A1F30` | Panels |
| surface-container-high / highest | `#25293A` / `#2F3446` | Raised panels, hover (26) |
| on-surface | `#DEE1F9` | Theme text (41) |
| on-surface-variant | `#BBCAC5` | Theme secondary text |
| primary | `#B5FFF0` | Theme primary (lighter than the app accent) |
| primary-fixed-dim / surface-tint | `#4DDCC6` | Tints (26) |
| secondary | `#C0C1FF` | Theme secondary (26) |
| error / error-container | `#FFB4AB` / `#93000A` | Theme error |
| outline / outline-variant | `#859490` / `#3C4946` | Theme outlines |

## Glass surfaces

| Name | Value | Where used |
|------|-------|-----------|
| glass-lane | fill `white/0.04`, border `white/0.08`, blur 24px | Kanban columns |
| glass-card | fill `white/0.08`, border `white/0.14`, blur 16px, inset top `0 1px 0 white/0.20` | Task cards (most common fill, 90) |
| glass-subtle | fill `white/0.05`–`0.06` | Inputs, nav bar, secondary areas (121) |
| glass-overlay | fill `white/0.12`, border `white/0.22`, blur 32px | Modals, drawer, menus, toast |
| glass-hover | fill `white/0.14`, border `white/0.22` | Hover and selected states |
| input | fill `white/0.05`, border `white/0.12`, focus border `#5EEAD4` + ring `0 0 0 3px rgba(94,234,212,0.15)` | Text fields |
| aurora-blur | `blur-[130px]`–`blur-[160px]`, mostly 140px | Background glows |

## Shadows and glows

| Name | Value | Where used |
|------|-------|-----------|
| card | `0 8px 24px -4px rgba(0,0,0,0.35)` | Cards (36) |
| panel | `0 8px 32px 0 rgba(0,0,0,0.37)` | Panels, nav bar (8) |
| overlay | `0 20px 48px -8px rgba(0,0,0,0.6)` | Modals, drawer |
| card-raised | `0 12px 28px -4px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.22)` | Dragged or hovered card |
| accent-glow | `0 0 16px rgba(94,234,212,0.35)` | Primary buttons (9) |
| accent-glow-sm | `0 0 8px rgba(94,234,212,0.3–0.4)` | My-task edge, focus (13) |
| status-glow | `0 0 8px <status color>` | Column dots |
| drag | scale 1.02, rotate 2°, teal edge at 30% | Card mid-drag |

## Typography

Font: **Plus Jakarta Sans** (Google Fonts). Icons: **Material Symbols Outlined**, weight 300.

| Name | Size / line height | Weight | Tracking | Where used |
|------|--------------------|--------|----------|-----------|
| headline-xl | 32 / 40px | 700 | -0.02em | Page titles ("Customer Portal") |
| headline-lg | 24 / 32px | 600 | -0.015em | Modal and drawer titles |
| headline-md | 18 / 24px | 600 | -0.01em | Card titles |
| body-lg | 16 / 24px | 400 | -0.005em | Descriptions |
| body-md | 14 / 20px | 400 | 0 | Body text, comments |
| body-sm | 12 / 16px | 400 | 0.01em | Card summaries, metadata |
| label-lg | 14 / 18px | 600 | 0.01em | Column titles, buttons |
| label-md | 12 / 16px | 600 | 0.02em | Field labels |
| label-sm | 11 / 14px | 500 | 0.03em | Chips, counters |

Screens also use one-off sizes `10px`, `13px`, `15px` and `20px`; normalize them to the scale above.

## Corner radii

| Name | Value | Where used |
|------|-------|-----------|
| pill | 9999px | Buttons, chips, avatars, badges (560) |
| lane | 20px | Columns (`rounded-[20px]`, 33) |
| card | 16px | Task cards (`rounded-[16px]`, `rounded-2xl`) |
| overlay | 24px | Modals and drawer (`rounded-3xl`) |
| input | 12px | Text fields (`rounded-xl` in Tailwind defaults) |

Note: the Stitch Tailwind config redefines `rounded-lg` as 8px and `rounded-xl` as 12px, unlike
default Tailwind. Use the pixel values above, not the class names.

## Spacing

| Name | Value | Where used |
|------|-------|-----------|
| space-xs | 4px | Icon gaps |
| space-sm | 8px | Chip padding, small gaps (`gap-2`, most common) |
| space-md | 16px | Card padding (`p-4`) |
| gutter / space-lg | 20px | Gap between columns |
| space-xl | 28px | Section spacing |
| margin | 32px | Page margin |
| lane width | 300–380px | Column min and max width |

## Differences from the planned design system (`design-prompt.md`)

- **Matches**: canvas `#0B1020`, accent `#5EEAD4`, text `#E6E9F2` / `#A3ACC2`, all four status
  colors, aurora colors, avatar colors, Plus Jakarta Sans, pill buttons, 16px cards, 20px lanes,
  24px overlays.
- **Glass is lighter than planned in places**: columns use `white/0.04` (plan: 0.08). Refinement 1
  asked for about 0.14 behind text; only overlays reach 0.12–0.14. Check text contrast on columns
  during implementation (FR-025, WCAG AA).
- **Aurora**: Stitch uses 12–18% opacity and 140px blur, matching refinement 7 rather than the
  original 25%.
- **Extra theme**: Stitch added a Material-style token set (`#0E1323` surface, `#B5FFF0` primary,
  etc.) that the plan didn't define. Prefer the app palette above; treat the theme set as fallback.
- **New tokens not in the plan**: input radius 12px, input focus ring, column min/max width, drag
  scale 1.02, Material Symbols icons.
- **Disabled color** `#6B7491` from the plan is unused.

## Out-of-scope elements Stitch added (do not implement)

Stitch invented features that the spec excludes. They appear in the mockups but MUST NOT be built:

- Navigation tabs "Workspace", "Boards", "Timeline", "Analytics"; search bar; notifications bell;
  settings icon; "Board / List" toggle; "Filter" button.
- Task tags/labels (e.g., "Frontend", "Reports"), ticket IDs (`#TP-092`), checklist counts (`6/8`),
  progress bars, due dates ("2d"), priority flags, comment counts on cards.
- "Sprint 24 · Active" badge; "Team" avatar group with "+" (adding users); footer with
  "Realtime sync active (4 peers connected)", "Documentation", "Shortcuts"; per-column "+" and "…"
  buttons (columns can't be changed).

Card content in scope: title, assignee avatar and name (or Unassigned), "You" chip, and the
"Move to" menu button.
