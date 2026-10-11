---
name: "speckit-design-plan"
description: "Plan the UI design for the current feature spec: write a Google Stitch prompt file (design-prompt.md) with one prompt per screen, plus a design manifest that tracks each screen."
argument-hint: "Optional design direction, e.g. platform (web/mobile), visual style, brand colors, or a path to a spec file"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "local"
  source: ".claude/skills/speckit-design-plan/SKILL.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before design planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_design_plan` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

Goal: Turn the feature specification into a ready-to-paste prompt file for **Google Stitch** (stitch.withgoogle.com), Google's AI UI design tool, so the user can generate high-fidelity screen designs that match the spec.

Note: This command reads the spec; it MUST NOT modify `spec.md`, `plan.md`, or `tasks.md`. It is best run after `/speckit-specify` (and ideally `/speckit-clarify`) and can be run before or after `/speckit-plan`.

Execution steps:

1. **Resolve the spec file**:
   - If `$ARGUMENTS` contains a path to an existing `.md` file, use that file as `FEATURE_SPEC` and its parent directory as `FEATURE_DIR`.
   - Otherwise run `python3 .specify/scripts/python/check_prerequisites.py --json --paths-only` from repo root **once** (or `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly`; if `python3` is not found, try `python`). Parse `FEATURE_DIR` and `FEATURE_SPEC`.
   - If JSON parsing fails or `FEATURE_SPEC` does not exist, abort and instruct the user to run `/speckit-specify` first (do not create a spec here).
   - For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context** (read-only):
   - REQUIRED: `FEATURE_SPEC`.
   - IF EXISTS: `.specify/memory/constitution.md` (UX, accessibility, or branding principles), `FEATURE_DIR/plan.md` (target platform such as web vs. mobile, UI framework or component library), and `FEATURE_DIR/design-prompt.md` (a previous run — you will overwrite it, so note any user-added content under a `## Notes` heading and carry it forward).

3. **Extract the design inventory** from the spec. Build this internally:
   - **Product summary**: what the app is, who uses it, in one or two sentences.
   - **Personas**: user roles from the spec and what each needs from the UI.
   - **Screens**: every distinct screen, page, modal, dialog, or panel implied by the user stories and acceptance scenarios (e.g. a selection screen, a list view, a board view, a detail panel, a create/edit form). For each screen record: its purpose, the user story/priority it serves, the key content and data shown (use realistic sample data from the spec where given, e.g. real user names, project names, column names), primary and secondary actions, and navigation to/from other screens.
   - **States**: empty, loading, error, validation, and edge-case states from the Edge Cases section and Functional Requirements (e.g. empty column, very long title, deleted assignee, required field missing).
   - **Interaction cues**: drag and drop, highlighting of "my" items, inline editing, confirmations — anything the visuals must communicate.
   - **Constraints**: platform, accessibility needs, and anything the spec explicitly excludes (e.g. no login screen) so Stitch does not invent it.
   - Order screens by the priority of the user story they first appear in (P1 first).

4. **Choose the visual direction**:
   - If `$ARGUMENTS`, the constitution, or the plan specify platform, style, colors, fonts, or a component library, use them.
   - Otherwise pick a sensible default suited to the product and state it as an assumption in the file: platform (default **Web, desktop-first, responsive** unless the spec implies mobile), a clean modern style, a light theme, one primary accent color given as a hex value, a neutral palette, one sans-serif font family, corner radius, and density.
   - Assign each distinct status/category in the spec (e.g. Kanban columns) a distinct but harmonious color, and give each persona an avatar treatment (initials on a colored circle).
   - Do not ask the user questions; record assumptions instead so they can edit them.

5. **Write prompts following Google Stitch best practices**:
   - **One screen per prompt.** Stitch produces the best results when each prompt describes a single screen or a single change. Never combine several screens into one prompt.
   - **Start broad, then go specific.** The first prompt describes the whole app and generates the primary (P1) screen; later prompts add one screen each, referring back to "the same design system/style as the previous screen".
   - **Keep each prompt self-contained and under ~2,000 characters**; Stitch handles focused prompts far better than long ones, and very long prompts may be truncated or partially ignored.
   - **Use precise UI vocabulary**: navigation bar, sidebar, card, badge, chip, avatar, modal, drawer, dropdown, text field, primary button, empty state, toast, etc.
   - **Specify layout explicitly**: regions (header, sidebar, main content, columns), alignment, and hierarchy, top to bottom.
   - **State the vibe and theme**: adjectives (e.g. "calm, focused, professional"), theme, accent hex color, font, corner radius.
   - **Use realistic content** from the spec instead of lorem ipsum: real names, roles, project names, task titles, comment text.
   - **Show interactions visually**: since Stitch produces static screens, describe what indicates an interaction (e.g. a card shown mid-drag with a shadow and a highlighted drop zone; "my tasks" with an accent left border).
   - **Write prompts in plain prose**, not markdown lists or code, so they paste cleanly into Stitch.
   - Do not mention implementation technology (frameworks, databases, APIs).
   - Refinement prompts must each make **one small, targeted change** and name the exact element to change (e.g. "On the board screen, make the column header counts a subtle gray badge").

6. **Write `FEATURE_DIR/design-prompt.md`** with this structure (omit a section only if it truly does not apply):

   ```markdown
   # Google Stitch Design Prompts: [FEATURE NAME]

   **Source spec**: [relative path to spec.md]
   **Generated**: [YYYY-MM-DD]
   **Platform**: [Web / Mobile] — select the matching mode in Stitch before pasting.

   ## How to use
   1. Open https://stitch.withgoogle.com and start a new project in [Web/Mobile] mode.
   2. Paste Prompt 1 to establish the design system and the primary screen.
   3. Paste each screen prompt in order, one at a time, in the same project.
   4. Use the refinement prompts afterwards, one change per message.
   5. When you are happy with the result, download all frames as a .zip, place it in this folder, and run `/speckit-design-import`.

   ## Design System
   [Bullets: vibe adjectives, theme, primary/accent hex, neutral palette, status/category colors with hex, font, corner radius, spacing/density, avatar style, iconography. Mark defaults as assumptions.]

   ## Screen Inventory
   | # | Screen | Purpose | User Story | Priority |
   |---|--------|---------|------------|----------|

   ## Prompt 1 — App overview + [primary screen name]
   ```text
   [Plain prose prompt: product summary, audience, vibe, design system, then the full layout of the primary screen with realistic content.]
   ```

   ## Prompt 2 — [Screen name]
   ```text
   [One screen per prompt, same style reference, layout, content, actions, notable states.]
   ```

   [... one section per screen ...]

   ## State Prompts
   [One prompt per important empty/error/validation/edge state, each as a ```text block.]

   ## Refinement Prompts
   [5–10 small, targeted follow-up prompts as ```text blocks covering accessibility contrast, visual hierarchy, highlighting "my" items, responsive/narrow layout, and consistency.]

   ## Out of Scope (do not design)
   [Things the spec explicitly excludes, e.g. login/password screens.]

   ## Assumptions
   [Every design decision not stated in the spec or user input.]

   ## Notes
   [Carried-forward user notes from a previous run, if any; otherwise omit.]
   ```

7. **Validate** before saving:
   - Every user story in the spec maps to at least one screen prompt, and every screen in the inventory has a prompt.
   - Every edge case with a visible UI effect is covered by a screen or state prompt.
   - No prompt describes more than one screen; no screen prompt exceeds ~2,000 characters.
   - No prompt contains lorem ipsum, implementation technology, or anything listed under Out of Scope.
   - Colors are given as hex values and are consistent across all prompts.
   - Prompt bodies are plain prose inside ```text fences.

8. **Create or update the design manifest** at `FEATURE_DIR/design/manifest.md`. This file tracks every screen through its lifecycle and is read by `/speckit-design-import`, `/speckit-plan`, and `/speckit-tasks`:

   ```markdown
   # Design Manifest: [FEATURE NAME]

   **Prompts**: ../design-prompt.md
   **Stitch Project**: [optional: Stitch project URL, filled in by the user; "—" if unknown]

   | # | Slug | Screen | Prompt | User Story | Status | Design Files | Implemented In |
   |---|------|--------|--------|------------|--------|--------------|----------------|
   | 1 | board | Project board | Prompt 1 | US1 (P1) | planned | — | — |
   ```

   - One row per screen prompt and per state prompt that represents a distinct screen variant. Slugs are short kebab-case names, unique within the feature.
   - `Status` values: `planned` (prompt exists) → `generated` (design files saved) → `implemented` (built in the frontend). Only this command sets `planned`.
   - If the manifest already exists, keep the `Status`, `Design Files`, `Implemented In`, and `Stitch Project` values of rows whose slug still exists; add new rows as `planned`; mark rows whose screen no longer exists in the spec as `removed` instead of deleting them.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion to the user.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_design_plan`, skip to the Completion Report.
- If it exists, read it and look for entries under the `hooks.after_design_plan` key.
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue to the Completion Report.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Mandatory hook** (`optional: false`) — **You MUST emit `EXECUTE_COMMAND:` for each mandatory hook**:
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```

## Completion Report

Report:
- Path to the generated `design-prompt.md`.
- Platform and visual direction chosen, and which choices are assumptions.
- Number of screen prompts, state prompts, and refinement prompts.
- Mapping of user stories → screens (compact table).
- Any spec gaps that blocked a confident design (e.g. unclear screen flow); suggest `/speckit-clarify` if they matter.
- Suggested next step: paste the prompts into Google Stitch, download all frames as a .zip into the feature folder, and run `/speckit-design-import`; then run `/speckit-plan` to plan their frontend implementation.

## Done When

- [ ] Spec resolved and read without modification
- [ ] `FEATURE_DIR/design-prompt.md` written with design system, screen inventory, one prompt per screen, state prompts, refinement prompts, out-of-scope list, and assumptions
- [ ] Validation checks in step 7 pass
- [ ] `FEATURE_DIR/design/manifest.md` created or updated with one row per screen
- [ ] Extension hooks dispatched or skipped according to the rules in Mandatory Post-Execution Hooks above
- [ ] Completion reported to user
