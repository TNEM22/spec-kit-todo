---
name: "speckit-plan"
description: "Execute the implementation planning workflow using the plan template to generate design artifacts."
argument-hint: "Optional guidance for the planning phase"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/plan.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_plan` key
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

1. **Setup**: Run `python3 .specify/scripts/python/setup_plan.py --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, FEATURE_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).
   - **IF EXISTS**: Read the UI design artifacts from `/speckit-design-plan` and `/speckit-design-import`: `FEATURE_DIR/design/manifest.md`, `FEATURE_DIR/design/tokens.md`, `FEATURE_DIR/design-prompt.md`, and the files under `FEATURE_DIR/design/screens/`. These drive Phase 1 step 4 (UI Design Implementation).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Plan the frontend implementation of every unimplemented UI design (if a design manifest exists)
   - Re-evaluate Constitution Check post-design

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion to the user.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_plan`, skip to the Completion Report.
- If it exists, read it and look for entries under the `hooks.after_plan` key.
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

Command ends after Phase 1 design. Report branch, IMPL_PLAN path, and generated artifacts.
If a design manifest exists, also report the number of designs planned for frontend implementation, the number already implemented, and any screens still `planned` (with a suggestion to paste their prompts into Stitch and run `/speckit-design-import` first).

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Define interface contracts** (if project has external interfaces) → `/contracts/`:
   - Identify what interfaces the project exposes to users or other systems
   - Document the contract format appropriate for the project type
   - Examples: public APIs for libraries, command schemas for CLI tools, endpoints for web services, grammars for parsers, UI contracts for applications
   - Skip if project is purely internal (build scripts, one-off tools, etc.)

3. **Create quickstart validation guide** → `quickstart.md`:
   - Document runnable validation scenarios that prove the feature works end-to-end
   - Include prerequisites, setup commands, test/run commands, and expected outcomes
   - Use links or references to contracts and data model details instead of duplicating them
   - Do not include full implementation code, model/service/controller bodies, migrations, or complete test suites
   - Keep this artifact as a validation/run guide; implementation details belong in `tasks.md` and the implementation phase

4. **UI Design Implementation** (only if `FEATURE_DIR/design/manifest.md` exists; skip silently otherwise):
   - **Find unimplemented designs**: For each manifest row with `Status` = `generated`, or `implemented` but now in doubt, search the frontend source code (using the Project Structure from this plan) for a page, route, or component that renders that screen. A row counts as implemented only if such code exists and visibly matches the design: its layout regions, key components, and states. Set `Status` to `implemented` and fill `Implemented In` with the file path(s) for rows that are; leave all other rows unchanged. This is the only edit `/speckit-plan` makes to the manifest.
   - Rows still `planned` (prompt written but no design generated) are listed under "Pending designs" and are NOT planned for implementation. Rows marked `removed` are ignored.
   - **Add a `## UI Design Implementation` section to IMPL_PLAN** (after Project Structure) containing:
     - **Design source**: links to `design/manifest.md`, `design/tokens.md`, and `design-prompt.md`.
     - **Design tokens plan**: how the tokens in `design/tokens.md` become frontend theme values (e.g. CSS variables or a theme file) at a concrete path in the chosen frontend structure. Plan this once, as shared setup.
     - **Shared components**: UI components reused across 2 or more screens (e.g. avatar, task card, badge, modal shell), each with a target frontend path.
     - **Screen implementation table**, one row per unimplemented generated design:

       | Slug | Screen | User Story | Design Reference | Frontend Target (page/component paths) | Shared Components Used | States to Build | Data/Contract Dependencies |
       |------|--------|------------|------------------|----------------------------------------|------------------------|-----------------|----------------------------|

       `Design Reference` points to `design/screens/<slug>/screen.html` and/or `screen.png`. `States to Build` lists the empty/loading/error/edge states from the design and spec. `Data/Contract Dependencies` names the entities in data-model.md and the contracts that the screen needs.
     - **Already implemented**: slugs and their `Implemented In` paths. Do not plan these again.
     - **Pending designs**: slugs still `planned`.
     - **Implementation rules**: the Stitch HTML is a visual reference, not production code. Rebuild it with the plan's frontend stack and components, apply the design tokens instead of hard-coded values, keep accessibility (contrast, keyboard access, labels) at least as good as the design, and match layout and states from the screenshot.
   - **Write `contracts/ui-screens.md`**: For each screen in the implementation table, write a UI contract: route/entry point, inputs (route params, selected user, etc.), data displayed, user actions and the contract/API each one calls, navigation targets, and required states. `/speckit-tasks` maps these to frontend tasks per user story.
   - Add `design/` and `contracts/ui-screens.md` to the Documentation tree in Project Structure, and make sure the Source Code structure includes the frontend paths used in the table.

**Output**: data-model.md, /contracts/*, quickstart.md, and (when designs exist) the UI Design Implementation section in plan.md plus contracts/ui-screens.md

## Key rules

- Use absolute paths for filesystem operations; use project-relative paths for references in documentation
- ERROR on gate failures or unresolved clarifications

## Done When

- [ ] Plan workflow executed and design artifacts generated
- [ ] If `design/manifest.md` exists: every generated but unimplemented design appears in the UI Design Implementation section and in `contracts/ui-screens.md`, and implemented designs are marked in the manifest
- [ ] Extension hooks dispatched or skipped according to the rules in Mandatory Post-Execution Hooks above
- [ ] Completion reported to user with branch, plan path, and generated artifacts
