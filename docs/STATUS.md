# ClipForge — Current Status

> Last verified: 2026-11-02 (resizable panels)  
> Update this file whenever implementation status or validation changes.  
> Status labels: `DONE` = implemented and verified; `PARTIAL` = some working code exists; `PLANNED` = not implemented; `BLOCKED` = cannot proceed without resolving a dependency/decision.

## Design reference

- The user-provided mockup (2026-11-01) is the primary visual target. See [UI_SPEC.md](UI_SPEC.md) for layout, behavior and implementation priorities.
- Target shell: compact global toolbar; Material Library left; Preview workspace center; Inspector/AI right; full-width multi-track timeline at bottom.
- Existing CSS grid is already arranged in this general topology, but dimensions, density, controls and component behavior still need alignment with the reference.

## Snapshot

| Area | Status | Verified notes |
|---|---|---|
| Repository/app scaffold | PARTIAL | Vite + React + TypeScript + Tauri 2 structure exists. |
| Project data model | PARTIAL | Version 1 types and sample project exist; persistence/migrations do not. |
| Zustand stores | PARTIAL | Project, playback, template, UI and render stores exist. |
| Template manifests/index | DONE | Two manifests; `npm run templates:index` succeeded. |
| Top-level layout | PARTIAL | TopBar, MaterialLibrary and ModePlaceholder components exist. Side panels and timeline height are user-resizable via drag handles (clamped in `uiStore`); handles hidden in narrow-screen layouts. |
| Preview | PARTIAL | PreviewStage composes active scene/overlay iframe layers, playback controls, and now scales the frame to the available panel (ResizeObserver); verified in browser. |
| Inspector | DONE | Manifest-driven text/textarea/number/color/enum controls, selected clip metadata, resolved timing, and duplicate/delete clip actions; verified in browser. |
| Timeline | PARTIAL | Ruler seeking, zoom, word-caption blocks, overlay/video lanes, clip selection, playhead, plus clip drag (word-snapped move) and left/right resize handles; audio lane is still a placeholder (no waveform); clip creation happens through the library, not on the timeline itself. |
| Material Library | PARTIAL | Search by name/id, data-driven category chips (All/Scene/Overlay), "+ Insert" at the playhead word, and live 9:16 template preview thumbnails (mini iframes rendering the actual template with manifest defaults; word-driven templates get demo words). |
| Project mutation actions | PARTIAL | `projectStore` now has `addClip`, `deleteClip`, `duplicateClip`, `setClipAnchors`, `shiftClip`; covered by unit tests. |
| Asset import/library | PLANNED | MaterialLibrary lists templates; it is not a full imported asset manager. |
| Project save/open | PLANNED | No persistence implementation verified. |
| Undo/redo | PLANNED | Explicit TODO in projectStore. |
| Audio import/transcription/alignment | PLANNED | Sample data only; no end-to-end pipeline verified. |
| Variants | PLANNED | Data type exists; UI and render flow not implemented. |
| Native render queue | PLANNED | Rust RenderJob model exists; queue/sidecar/event integration is not implemented. |
| Renderer | PARTIAL | Node renderer script exists; end-to-end output not verified in this handoff. |
| AI agent integration | PLANNED | Product direction only; no integration verified. |
| Automated tests | PARTIAL | Vitest suite (42 tests) covers `anchors.ts`, `insert.ts`, `templates.ts` and `projectStore`; no component/e2e tests yet. |
| Git repository | BLOCKED | `git status` reports this directory is not a Git repository. |

## Verified implementation details

### Frontend
- `src/App.tsx` loads the template index on mount, updates playback duration from project audio duration, and switches between editor and placeholder modes.
- `src/components/layout/TopBar.tsx` exists.
- `src/components/layout/MaterialLibrary.tsx` provides search (name/id), data-driven category chips, a "+ Insert" action per template card (playhead word via `lib/insert.wordIndexAtTime` → `projectStore.addClip`), and live 9:16 preview thumbnails: each card renders the real template in a scaled iframe with manifest defaults and the active theme tokens; word-driven templates receive demo words (`PREVIEW_WORDS`) so their tile is not blank. Tile scale recomputes from the grid width via ResizeObserver.
- `src/components/layout/ModePlaceholder.tsx` exists.
- `src/components/preview/PreviewStage.tsx` resolves scene/overlay clips against word anchors, builds template URLs, displays currently active iframe layers, synchronizes local template time through `__seek`, and scales the frame to the available center panel via ResizeObserver (360×640 display ceiling).
- The preview uses the shared playback store for playhead state.
- `src/components/inspector/Inspector.tsx` renders parameter controls from the selected clip's template manifest, writes edits through `projectStore.setClipParam`, and offers Duplicate/Delete actions.
- `src/components/timeline/Timeline.tsx` renders ruler, zoom controls, word blocks, overlay/video lanes, selection and playhead. Clips can be dragged (word-index snap) and resized via left/right handles; all changes go through `projectStore.shiftClip`/`setClipAnchors`, never a second time representation. Audio lane is an explicit empty placeholder.

### Data and state
- Project format version: `PROJECT_VERSION = 1`.
- Sample project: “Short Krakatau 1883”, 1080×1920 at 30 FPS, audio duration 8.5 seconds, sample Indonesian word timings, one karaoke caption overlay and one fact-card overlay.
- Sample project has no scene clips.
- Clip timing is represented by `WordAnchor` references, not stored absolute start/end seconds.
- `projectStore` supports: `selectClip`, `setClipParam`, `addClip(template, startWord)` (default params, overlap-aware overlay lane via `lib/insert.pickOverlayLane`, unique id generation), `deleteClip` (clears selection), `duplicateClip`, `setClipAnchors`, `shiftClip`.
- Insertion/anchor helper logic lives in `src/lib/insert.ts` (pure, unit-tested).
- `playbackStore` owns the shared playhead, play/pause and duration.
- `templateStore` loads `/templates/index.json`.
- `renderStore` is currently an in-memory placeholder store.

### Templates
- `caption-karaoke`: overlay, requires word timing data.
- `fact-card`: overlay, accepts title/body/accent/animation parameters.
- Both use the HTML template runtime contract documented in [TEMPLATE_CONTRACT.md](TEMPLATE_CONTRACT.md).

### Native/backend
- Tauri config uses dev port 1420 and frontend output `../dist`.
- Rust command `app_info` is a bridge smoke-test command.
- Rust `RenderJob` is a data model only; queue execution, process spawning and progress events are TODO.
- Renderer direction in code comments: Node sidecar, headless Chromium, PNG frames and FFmpeg.

## Validation log

| Check | Last known result |
|---|---|
| `npm run templates:index` | PASS — indexed 2 templates (caption-karaoke, fact-card); re-run 2026-11-01 session 2. |
| `npm install` | PASS — dependencies present; `vitest` added as devDependency in session 2. |
| `npm run typecheck` | PASS — re-run after all session-2 changes. |
| `npm run build` | PASS — Vite production build completed after all session-2 changes. |
| `npm run test` (vitest) | PASS — 42 tests / 4 files (`anchors`, `insert`, `templates`, `projectStore`). |
| Browser smoke test (`npm run dev`, Chromium via automation) | PASS — layout renders, library search + insert, timeline selection, duplicate/delete, word-snapped drag (+90px = +1 word, verified twice), resize handles, play/pause, word-click seek, karaoke `__seek` sync, no stage/timeline overlap. |
| Panel resize smoke test (2026-11-02) | PASS — library 280→340px, inspector 320→380px, timeline 260→320px via drag handles (exact pixel tracking); double-click resets all three to defaults; clamp limits covered by unit tests. |
| Library card redesign smoke test (2026-11-02) | PASS — both cards render real template previews in 9:16 thumbs (karaoke shows demo words, fact-card shows default title/body), thumb iframe scale tracks panel resize (280→360px → scale 0.0917→0.1269), no badge/foot overflow at default panel width, insert still works. |
| `cargo check --manifest-path src-tauri/Cargo.toml` | BLOCKED — missing system `glib-2.0` development package / `glib-2.0.pc` (not re-run this session; unchanged environment). |
| `npm run tauri:dev` | BLOCKED — Rust/Tauri compilation stopped at missing `glib-2.0` (previous session). |
| Tauri desktop runtime test | NOT RUN — desktop window still unavailable. |

Do not convert “not run” into “pass”. Re-run checks after dependencies are installed.

## Known issues / limitations

- Panel sizes and timeline height reset on reload (in-memory `uiStore` only; no persistence yet).
- Resize handles are hidden below 1100px window width, where the grid falls back to fixed compact sizes.

- Preview stage scales to the panel but the maximum is still capped at 360×640 CSS pixels; it does not yet fill larger panels.
- Drag/resize snaps to whole word indices; per-frame offsets can only be edited in project JSON (anchor `offset` has no UI).
- Overlay lanes are limited to two visible rows (lane 0/1); `pickOverlayLane` clamps to lane 1.
- Long template names truncate with ellipsis at narrow panel widths (tooltip shows the full name).
- Audio lane has no waveform; no audio asset loading exists yet.
- Undo/redo, autosave and project save/open are not implemented.
- The in-browser smoke test covers the Vite frontend only; the Tauri desktop shell remains unverified.

## Immediate next steps

1. Project save/open (versioned JSON) + dirty state, then autosave.
2. Undo/redo history on top of the new projectStore mutation actions.
3. Audio import + waveform on the timeline audio lane.
4. Lane ordering UI and editing of anchor `offset` values in the Inspector.
5. Initialize Git and create a baseline commit after reviewing the working tree and user approval.

## Handoff instructions

A new agent should read [AGENTS.md](../AGENTS.md), this file, [PROJECT_BRIEF.md](PROJECT_BRIEF.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [TEMPLATE_CONTRACT.md](TEMPLATE_CONTRACT.md) before making changes. Then inspect the current source because this status file can become stale.
