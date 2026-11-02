# ClipForge — Session Handoff

> This file is the compact continuity note for switching between AI models or coding sessions.
> Keep it concise. Update it at the end of every meaningful work session.
> Last updated: 2026-11-02

## Current project identity

- Project: ClipForge — desktop-first AI-assisted short-video editor.
- Repository path: `/home/tensanq/Desktop/clipforge`.
- Stack: Tauri 2, Rust, React 19, TypeScript, Vite, Zustand, standalone HTML templates.
- Primary visual reference: user-provided desktop editor mockup. The detailed specification is `docs/UI_SPEC.md`.

## Read first when taking over

1. `AGENTS.md`
2. `docs/SESSION_HANDOFF.md` (this file)
3. `docs/STATUS.md`
4. `docs/UI_SPEC.md`
5. `docs/ARCHITECTURE.md`
6. Relevant subsystem contract/docs and actual source files.

Do not rely on previous chat history. Inspect the actual repository before coding.

## Current verified state

### Implemented / present
- Vite + React + TypeScript frontend scaffold, Tauri 2 / Rust scaffold, node_modules installed.
- Project and template types, sample project, Zustand stores, template manifest index generator.
- Two templates: `caption-karaoke` and `fact-card`.
- Undo/redo (T1): pure history engine `src/lib/history.ts` (100-step limit, 500 ms coalescing with injectable time), wired to every project mutation; TopBar Undo/Redo buttons + Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y hotkeys (`src/lib/useHotkeys.ts`).
- Project save/open + dirty state (T3): `src/lib/projectFile.ts` serializes/parses/validates `.clipforge.json` (version + shape checks); TopBar has Simpan (download) and Buka (file input) plus an honest "Belum disimpan / Tersimpan" state with an amber dot. Dirty is derived from a `lastSaved` reference snapshot, so undoing back to the saved state clears it. Native Tauri dialog/fs plugin transport is a documented follow-up.
- Panel layout persistence (T2): library/inspector width and timeline height persist in `localStorage` via injectable `src/lib/layoutStorage.ts` (clamped, corrupt-safe).
- `TopBar.tsx`, `ModePlaceholder.tsx`.
- Resizable panels: drag handles between library/preview, preview/inspector, and above the timeline; sizes live in `uiStore` (clamped, double-click to reset, hidden under 1100px).
- `MaterialLibrary.tsx`: search by name/id, data-driven category chips (All/Scene/Overlay), "+ Insert" per template that adds a clip at the playhead word (`projectStore.addClip`), and live 9:16 template preview thumbnails (scaled mini iframes with manifest defaults + active theme tokens; word-driven templates get demo words; scale tracks panel resize via ResizeObserver).
- `PreviewStage.tsx`: active scene/overlay template iframe layers, anchor resolution, relative word timing, shared playback controls, template `__seek` synchronization, and panel-responsive stage sizing via ResizeObserver (360×640 ceiling).
- `Inspector.tsx`: manifest-driven text/textarea/number/color/enum editing, selected clip metadata and resolved timing, plus Duplicate/Delete clip actions.
- `Timeline.tsx`: ruler/seek, zoom, word caption blocks, video/overlay lanes, clip selection, playhead, and clip drag/resize that snaps to word indices through `projectStore.shiftClip`/`setClipAnchors`.
- `src/lib/insert.ts`: pure insertion/anchor helpers (`wordIndexAtTime`, `insertionAnchors`, `pickOverlayLane`, `uniqueClipId`, `shiftAnchor`).
- Vitest unit tests: 42 tests over `anchors.ts`, `insert.ts`, `templates.ts`, `projectStore` (`npm run test`).
- Documentation set: `AGENTS.md`, `README.md`, `CLAUDE.md`, `GEMINI.md`, Copilot instructions, Kiro steering, and docs for status, brief, architecture, roadmap, decisions, development, template contract and UI spec.

### Not implemented / not verified
- Autosave (manual save/open and dirty state exist).
- Audio import and waveform on the timeline audio lane.
- Anchor `offset` editing and lane reordering UI (drag/resize only shifts whole word indices).
- Real Material Library thumbnails (still a gradient placeholder).
- Real asset import and subtitle processing pipelines.
- Complete native render queue and production render integration.
- AI assistant integration and variant editing.
- Component/e2e tests (only unit tests exist).
- Git initialization / baseline commit (last checked: no `.git` directory).
- Tauri desktop runtime (`cargo check` blocked on system `glib-2.0`; only the browser frontend was runtime-tested).

### Last known validation (2026-11-02)
- `npm run templates:index`: PASS; indexed 2 templates.
- `npm run typecheck`: PASS (after merging T1+T2 and T3 save/open work).
- `npm run build`: PASS.
- `npm run test` (vitest): PASS; 88 tests / 8 files.
- Browser smoke test against `npm run dev` (Chromium automation, no Tauri): PASS — dirty dot + "Belum disimpan" on mutation; Undo button and Ctrl+Z restore the value and clear dirty; Redo re-marks dirty; Simpan clears dirty; library width 360px survives reload. Earlier: layout, search, insert, selection, duplicate/delete, word-snapped drag, resize handles, play/pause, word-click seek, karaoke `__seek` sync, panel resize sweep 200→440px. Open-file GUI flow NOT testable in the automation browser (upload unsupported) — covered by unit tests.
- `cargo check` / `npm run tauri:dev`: NOT RE-RUN; still expected BLOCKED on missing system `glib-2.0`.
- Tauri desktop runtime test: NOT RUN.

## Design direction — do not drift

Follow `docs/UI_SPEC.md` and the supplied mockup:
- Compact global toolbar.
- Material Library on the left.
- Preview workspace centered.
- Inspector and future AI assistant on the right.
- Full-width multi-track timeline along the bottom.
- Dense dark UI, charcoal/navy surfaces, subtle borders and dotted workspace, violet primary accent, amber AI/marker accents, teal secondary track accents.
- Keep the center preview visually dominant.
- Never show fake autosave, AI credit, AI output, render progress or functional controls.

## Architecture invariants

- Serialized `Project` is the canonical source of truth.
- `projectStore` owns project mutations and selected clip.
- `playbackStore` owns the only project playback clock.
- Resolve clip timing using word anchors through `src/lib/anchors.ts`.
- Template manifests are the source of parameter definitions/defaults.
- Regenerate `public/templates/index.json` after manifest changes using `npm run templates:index`.
- Preserve `docs/TEMPLATE_CONTRACT.md`: template HTML exposes `window.__ready` and deterministic `window.__seek(t)`.
- Current iframe sandbox uses `allow-scripts allow-same-origin` for trusted bundled templates only. Do not load untrusted community templates under this model.
- Do not treat TODOs, types or placeholder buttons as implemented features.

## Immediate recommended next tasks

1. T4 (agent): subtitle import SRT/VTT/JSON -> Project.words via a new store action (positions update through anchors automatically) + Ctrl+S save hotkey.
2. T5 (agent): audio import via file input + Web Audio duration extraction + waveform on the timeline audio lane.
3. Autosave on top of the dirty state.
4. Tauri-native save/open dialogs (plugin-dialog + plugin-fs) once `glib-2.0` is installed and `cargo check` passes.
5. Lane reordering UI and Inspector editing of anchor `offset` values.

## Work log

### 2026-11-01 — Documentation and handoff foundation
- Added cross-agent instructions and entry points: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.kiro/steering/clipforge.md`.
- Added project documentation: `README.md`, `docs/PROJECT_BRIEF.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/TEMPLATE_CONTRACT.md`, `docs/DEVELOPMENT.md`, `docs/UI_SPEC.md`.
- Recorded the user's mockup as the visual source of truth in `docs/UI_SPEC.md`.
- `npm run templates:index` had previously succeeded and indexed two templates.
- Typecheck/build were not run because dependencies were absent at last check.

### 2026-11-01 — Editor UI foundation
- **Goal:** Start implementing the editor UI based on `docs/UI_SPEC.md`.
- **Implemented:** Added manifest-driven Inspector parameter editing (text, textarea, number, color, enum), selected clip details and resolved timing. Added Timeline ruler/seek, zoom controls, word-caption blocks, video/overlay lanes, clip selection and playhead.
- **Files changed:** `src/components/inspector/Inspector.tsx`, `src/components/timeline/Timeline.tsx`, `src/styles/app.css`, `docs/STATUS.md`, `docs/ROADMAP.md`.
- **Validation:** `npm run templates:index` PASS (2 templates indexed). `npm run typecheck` NOT RUN because `node_modules/.bin/tsc` is absent. Build and manual runtime test NOT RUN.
- **Known issues:** Timeline has no clip drag/resize, audio waveform or clip creation/deletion. Material Library has no search/filter/insertion workflow. TypeScript compatibility remains unverified until dependencies are installed.
- **Next task:** Install dependencies and validate; then improve Material Library and timeline editing interactions.

### 2026-11-01 — M2 editing slice: clip mutations, library insertion, timeline drag/resize, tests
- **Goal:** Continue the unfinished handoff tasks — project mutation actions, Material Library search/filter/insertion, timeline drag/resize, and automated tests.
- **Implemented:** `projectStore` gained `addClip`/`deleteClip`/`duplicateClip`/`setClipAnchors`/`shiftClip`; new pure helper module `src/lib/insert.ts`. MaterialLibrary got search, category chips and "+ Insert" at the playhead word. Timeline clips are now draggable (word-index snap) with left/right resize handles. Inspector got Duplicate/Delete actions. PreviewStage stage is now scaled to the available panel via ResizeObserver, fixing the stage overlapping the timeline/transport at short window heights.
- **Files changed:** `src/stores/projectStore.ts`, `src/lib/insert.ts` (new), `src/components/layout/MaterialLibrary.tsx`, `src/components/timeline/Timeline.tsx`, `src/components/inspector/Inspector.tsx`, `src/components/preview/PreviewStage.tsx`, `src/styles/app.css`, `package.json` (+vitest), test files `src/lib/anchors.test.ts`, `src/lib/insert.test.ts`, `src/lib/templates.test.ts`, `src/stores/projectStore.test.ts` (new), `docs/STATUS.md`, `docs/ROADMAP.md`, this file.
- **Validation:** `npm run templates:index` PASS (2 templates). `npm run typecheck` PASS. `npm run build` PASS. `npm run test` PASS (42 tests). Browser smoke test via automation against the dev server PASS (layout, search, insert, selection, duplicate/delete, word-snapped drag verified at +90px = +1 word twice, resize handles, play/pause, word-click seek, karaoke `__seek` sync, no stage/timeline overlap). `cargo check` / Tauri runtime NOT RUN (still blocked on system `glib-2.0`).
- **Known issues:** Thumbnails are placeholders; anchor `offset` has no UI; lanes limited to 2 visible rows; synthetic multi-point drags occasionally overshot one word; Tauri desktop shell unverified.
- **Next task:** Project save/open + dirty state, then undo/redo.

### 2026-11-02 — Resizable panels
- **Goal:** Make the Material Library panel, Inspector panel and timeline height user-resizable (UI_SPEC §8).
- **Implemented:** `uiStore` layout state (`libraryWidth`, `inspectorWidth`, `timelineHeight`) with clamped setters; new `Resizer` drag-handle component; `App` renders three handles and feeds CSS variables (`--lib-w`, `--insp-w`, `--tl-h`) into the app grid. Handles hidden in the ≤1100px/≤820px fixed layouts; double-click resets to defaults.
- **Files changed:** `src/stores/uiStore.ts`, `src/stores/uiStore.test.ts` (new), `src/components/layout/Resizer.tsx` (new), `src/App.tsx`, `src/styles/app.css`, `docs/STATUS.md`, `docs/ROADMAP.md`, this file.
- **Validation:** `npm run typecheck` PASS. `npm run test` PASS (44 tests). `npm run build` PASS. Browser smoke test PASS: library 280→340px, inspector 320→380px, timeline 260→320px via drags (exact pixel tracking), double-click reset to 280/320/260 verified.
- **Known issues:** Panel sizes are in-memory only (reset on reload).
- **Next task:** Project save/open + dirty state, then undo/redo.

### 2026-11-02 — Material Library card redesign (live template thumbnails)
- **Goal:** User feedback that the library cards looked wrong, especially after resizing the panel.
- **Implemented:** Replaced the dashed placeholder thumb with a real 9:16 preview: each card renders the actual template in a mini iframe (manifest default params + active theme tokens; word-driven templates receive `PREVIEW_WORDS` demo words so the tile is not blank). Tile scale derives from the measured card width via ResizeObserver (`--thumb-scale`), so thumbnails follow panel resizes automatically. Tightened card CSS: ellipsized name, wrap-able smaller badges, compact footer (`duration · FPS` + Insert), hover accent border.
- **Files changed:** `src/components/layout/MaterialLibrary.tsx`, `src/styles/app.css`, `docs/STATUS.md`, this file.
- **Validation:** `npm run typecheck` PASS. `npm run test` PASS (44). `npm run build` PASS. Browser DOM audit across the full library resize range (200px → 440px → 280px): zero problems — thumb iframe scale matched measured width at every step, no panel horizontal overflow, Insert button never clipped, preview stage stayed inside its panel.
- **Known issues:** Thumbnails are static (rendered at t=0; no playback loop per tile). At 200px panel width, long names rely on ellipsis + tooltip.
- **Next task:** Project save/open + dirty state, then undo/redo.

## End-of-session update template

Append a new dated entry to Work log and update the sections above:

```md
### YYYY-MM-DD — Short task title
- **Goal:**
- **Implemented:**
- **Files changed:**
- **Validation:** PASS / FAIL / NOT RUN, with exact commands.
- **Known issues:**
- **Next task:**
```

Update `docs/STATUS.md` and `docs/ROADMAP.md` whenever implementation status changes. This handoff file summarizes continuity; it does not replace detailed documentation.

### 2026-11-02 — Multi-agent round: T1 merge, T2, T3 (save/open + dirty)
- **Goal:** User asked to use subagents to finish everything doable fast.
- **Done:** Verified and fast-forward-merged the opencode agent's T1 (undo/redo; 62 tests, typecheck/build PASS in its worktree). Launched a general-purpose subagent for T2 (layout persistence in localStorage via injectable `layoutStorage`; committed `b7fcd59` in worktree, merged). Launched an Explore agent for save/open research (recommendation: browser-native Blob/file-input first; Tauri plugins as follow-up). Implemented T3 myself: `src/lib/projectFile.ts` (+ tests), `projectStore` dirty tracking derived from `lastSaved`, TopBar Simpan/Buka + honest save-state indicator. Found and fixed a real bug: store init created three different sample instances so undo-to-saved didn't clear dirty.
- **Files changed:** merged T1/T2 commits (`5449d56`, `b7fcd59`) + new `src/lib/projectFile.ts`/`.test.ts`, `src/stores/projectStore.ts`, `src/components/layout/TopBar.tsx`, `src/styles/app.css`, `src/stores/projectStore.test.ts`, docs.
- **Validation:** typecheck PASS, 88 tests / 8 files PASS, build PASS. Browser smoke PASS: dirty dot + "Belum disimpan" on mutation; Undo button and Ctrl+Z clear dirty; Redo re-marks dirty; Simpan clears dirty; 360px panel width survives reload. Open-file GUI flow untestable in the automation browser (upload unsupported) — covered by unit tests.
- **Known issues:** Open flow only validated by unit tests in GUI terms; autosave still open; Tauri runtime still blocked on `glib-2.0`.
- **Next task:** T4 subtitle import, then T5 audio import + waveform.
