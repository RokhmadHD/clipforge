# Agent Instructions — ClipForge

This file is the entry point for every AI coding agent working in this repository.

## 1. Start here

Before changing code:
1. Read this file completely.
2. Read `docs/SESSION_HANDOFF.md` for the compact cross-session handoff, then `docs/STATUS.md` for the verified current state and next task.
3. Read `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md` and `docs/UI_SPEC.md` for product, system and visual-design context.
4. Read the relevant contract before editing a subsystem:
   - Template runtime: `docs/TEMPLATE_CONTRACT.md`
   - Decisions: `docs/DECISIONS.md`
5. Inspect the actual source files. Documentation is a guide, not proof that code still matches it.

Do not assume prior chat history is available. This repository must contain enough context to continue independently.

## 2. Product intent

ClipForge is a desktop-first, AI-assisted short-video editor. It uses audio-aligned subtitle words as timing anchors, reusable HTML scene/overlay templates, project themes and variants, and a future automated render pipeline.

Keep the architecture approachable for a solo developer. Prefer small, composable changes over speculative frameworks.

## 3. Engineering rules

- Follow the existing stack: React, TypeScript, Vite, Zustand, Tauri 2 and Rust.
- Keep TypeScript strict. Avoid `any`; use the existing project/template types and extend them deliberately.
- Treat the serialized `Project` model as the canonical project state. Do not create competing sources of truth for timeline time, clip params or project metadata.
- Playback time belongs to `playbackStore`; do not create local playback clocks in components.
- Clip timing is word-anchor based. Resolve anchors through `src/lib/anchors.ts`; do not silently convert the project format to raw seconds.
- Template metadata belongs in each template's `manifest.json`. Regenerate `public/templates/index.json` with `npm run templates:index` after manifest changes.
- Preserve the template runtime contract in `docs/TEMPLATE_CONTRACT.md`.
- Keep UI components focused. Put reusable domain logic in `src/lib`, state transitions in stores, and Rust/native functionality in `src-tauri`.
- Do not claim a feature is implemented merely because a type, placeholder, TODO or UI button exists.
- Do not add dependencies without checking whether the current stack already covers the need. Explain meaningful new dependencies.
- Avoid destructive shell commands and broad rewrites. Inspect before editing.
- Do not overwrite user changes. Check the current file and use narrow patches.
- Do not add secrets, API keys, tokens, private paths or machine-specific configuration to tracked files.

## 4. Workflow

For each task:
1. State the intended scope briefly.
2. Inspect the relevant code and callers.
3. Implement the smallest complete vertical slice.
4. Run the most relevant checks available.
5. Report exact files changed, checks run, failures and known limitations.
6. Update `docs/STATUS.md` when implementation status, validation or next steps change. Update architecture/decision docs when contracts or design decisions change.

If dependencies are missing, do not claim typecheck/build passed. State the blocker and, if appropriate, ask before installing dependencies.

## 5. Validation commands

From the repository root:

```bash
npm run templates:index
npm run typecheck
npm run build
npm run dev
```

Tauri checks (when Rust/Tauri prerequisites are available):

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri:dev
```

Run only checks relevant to the change, and report which ones actually ran. The project currently may not have `node_modules`; check before assuming npm scripts can execute.

## 6. Definition of done

A task is not done until:
- The requested behavior is implemented, not just scaffolded.
- Types and error/empty/loading states are handled where relevant.
- Existing contracts and project data remain compatible, or migrations are documented.
- Relevant validation has been run, with honest results.
- Documentation reflects material changes.
- The final handoff tells the next agent exactly what is complete and what remains.

## 7. Communication

- Explain in concise Indonesian unless the user asks otherwise.
- Preserve English technical names where useful.
- Prefer concrete file paths, commands and copy-paste-ready steps.
- Ask one focused question only when a missing decision blocks implementation.
- Never invent test results, files, features or environment state.
