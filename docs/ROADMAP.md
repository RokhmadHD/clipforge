# ClipForge — Roadmap

Roadmap is directional. Update checkboxes only after implementation and validation.

## M0 — Foundation
- [x] Vite + React + TypeScript scaffold
- [x] Tauri 2 scaffold
- [x] Project/template TypeScript types
- [x] Sample project and Zustand stores
- [x] Template manifest index generator
- [x] Dependency install + clean typecheck/build baseline (verified 2026-11-01)
- [ ] Git initialization and first baseline commit

## M1 — Editor shell
- [x] TopBar shell
- [x] Template library panel (search, category filters, template listing)
- [x] Mode placeholder
- [x] PreviewStage with active template layers and playback controls (now panel-responsive)
- [x] Inspector with manifest-driven parameter controls
- [x] Timeline base with ruler, word blocks, overlay/video lanes, clip selection and playhead
- [x] Manual UI smoke test (browser, 2026-11-01; Tauri desktop shell still unverified)
- [x] Side panels and timeline height user-resizable (drag handles; sizes reset on reload until persistence exists)
- [ ] Responsive/minimum-window behavior and empty states

## M2 — Project editing foundation
- [x] Add/remove/duplicate clips (`projectStore.addClip/deleteClip/duplicateClip` + library insertion + Inspector actions)
- [ ] Edit word anchors and lane ordering (drag/resize with word snapping done; anchor `offset` editing and lane reordering still open)
- [ ] Project save/open (versioned JSON)
- [ ] Autosave and dirty-state handling
- [ ] Undo/redo history
- [ ] Project schema validation and migration tests

## M3 — Media and subtitles
- [ ] Import audio and visual assets
- [ ] Audio metadata/duration extraction
- [ ] Subtitle import (SRT/VTT/JSON)
- [ ] Word-level alignment workflow
- [ ] Re-alignment updates clip positions through anchors
- [ ] Waveform/timeline audio track

## M4 — Rendering
- [ ] Define deterministic renderer input contract
- [ ] Render templates at arbitrary timestamps
- [ ] Alpha compositing and scene/overlay ordering
- [ ] Audio muxing and FFmpeg encoding
- [ ] Tauri job queue, cancellation and progress events
- [ ] Output settings and render error UX
- [ ] Golden/sample render test

## M5 — AI-assisted workflows
- [ ] Define structured AI actions against Project
- [ ] Project-aware assistant for storyboard/template suggestions
- [ ] Subtitle/audio workflow assistance
- [ ] Approval gate for destructive or external actions
- [ ] Tool/action audit log and undo integration

## M6 — Variants and polish
- [ ] Variant editor and per-clip overrides
- [ ] Batch render variants
- [ ] Template discovery/import UX
- [ ] Performance profiling and preview optimization
- [ ] Packaging, installer and release checklist
