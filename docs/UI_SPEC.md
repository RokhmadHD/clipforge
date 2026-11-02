# ClipForge — UI Specification

> Visual source of truth: user-provided ClipForge mockup shared on 2026-11-01.
> This document describes the target editor experience. It does not imply every pictured control or feature is implemented.

## 1. Overall direction

Build a dense, professional desktop video-editing workspace. Use the supplied mockup as the primary visual reference for hierarchy, proportions, panel placement and interaction intent.

Visual language:
- Dark charcoal/navy workspace with subtle borders and compact typography.
- Near-black canvas/work area with a subtle dotted grid.
- Purple/violet as the primary interactive accent; amber/orange for AI suggestions, markers and selected semantic highlights; teal for secondary track/layer accents.
- Compact controls, thin separators, restrained corner radii and high information density.
- Avoid oversized cards, large empty padding and generic dashboard styling.
- The preview canvas is the visual focus; side panels and timeline are supporting work surfaces.

The screenshot is a design target, not a requirement to copy every pixel. Keep controls legible and responsive to window size.

## 2. Desktop layout

The editor has four persistent regions plus a global toolbar:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Global toolbar: app/project, undo/redo, zoom, autosave, AI credits, queue  │
├────────────────┬───────────────────────────────────────┬───────────────────┤
│ Material       │ Preview workspace                     │ Inspector / AI    │
│ Library        │                                       │                   │
│                │ Preview options                        │ Variant controls  │
│ Search/filter  │                                       │ Selected clip     │
│ Template grid  │ Canvas + safe areas                    │ Properties        │
│                │ Playback / compare controls            │ AI assistant      │
├────────────────┴───────────────────────────────────────┴───────────────────┤
│ Timeline toolbar, ruler, tracks, waveform, word captions, clips, playhead │
└────────────────────────────────────────────────────────────────────────────┘
```

Target proportions at a typical desktop window:
- Global toolbar: approximately 40–48 px high.
- Left Material Library: approximately 210–240 px wide.
- Right Inspector: approximately 250–290 px wide.
- Center Preview workspace: consumes remaining horizontal space.
- Timeline: approximately 190–230 px high, resizable in a later iteration.
- Side panels and timeline must have independent scrolling where appropriate.
- Use CSS grid/flex with min-width/min-height constraints; avoid hard-coded canvas scaling that breaks at other window sizes.

## 3. Global toolbar

Target contents, left to right:
- ClipForge app mark and name.
- Project title, version/dirty indicator.
- Undo and redo.
- Workspace zoom controls.
- Autosave state indicator.
- AI credit/usage indicator (only when a real billing/usage source exists).
- Render queue entry with active job count/status.
- Export action.

Behavior:
- Project title reflects the active project.
- Dirty/autosave indicator must reflect actual persistence state; do not display “Auto-save: on” until autosave exists.
- Undo/redo controls must be disabled or hidden until history is implemented.
- AI credits must not show fabricated balances.
- Render queue and Export controls must communicate unavailable/queued/running/completed states honestly.

## 4. Left panel — Material Library

Target contents:
- Header “Material Library”.
- Search field for templates/materials.
- Category/filter row (e.g. All, Scene, Caption, Overlay, Transition).
- Two-column template thumbnail grid.
- Each tile: visual thumbnail, template name, short metadata/type.
- Optional AI-assisted “create template” action at the bottom.

Behavior:
- Search filters by template name, ID and relevant tags.
- Category filters should be data-driven.
- Selecting/dragging a template should eventually add a clip to the timeline; do not imply drag/drop works until implemented.
- Template previews should use actual template thumbnails or generated preview frames, not permanent generic placeholders.
- Empty/loading/error states remain visible and understandable.

Current implementation note: MaterialLibrary currently lists manifests in a basic grid. Search, category filters, real thumbnails and insertion into the timeline are future work.

## 5. Center — Preview workspace

Top preview controls:
- Current preview label and project aspect/resolution.
- Safe-area overlay toggle.
- Platform framing/preset controls (e.g. TikTok/Reels/Shorts) when supported.
- Optional guides and preview zoom.

Canvas:
- Centered project frame, scaled to available workspace dimensions while preserving aspect ratio.
- Subtle dotted workspace background.
- Safe-area guides should be non-rendering UI overlays.
- Render active scene and overlay templates in correct layer order.
- Selected clip/layer may show selection bounds/handles in a later interaction milestone.

Playback controls:
- Play/pause, previous/next frame or marker, loop/seek controls as appropriate.
- Current time and total duration.
- Scrubbable timeline/playhead synchronized with the shared playback store.
- Compare variants A/B control when variant comparison is implemented.

AI suggestion:
- Contextual suggestion card may appear near the preview/timeline.
- Must show the suggested change and its target clip/parameter.
- Provide explicit accept/reject actions.
- Never silently mutate the project from a suggestion.

Current implementation note: PreviewStage already mounts active template iframes and synchronizes them through the shared playback store and template `__seek` API. Current stage sizing is fixed/limited and needs adaptation to the available center panel.

## 6. Right panel — Inspector and AI

The right panel is a vertically scrollable workspace with compact sections/tabs.

Inspector target:
- Selected clip/template title and context.
- Template-specific controls generated from manifest parameter definitions.
- Text, multiline, number, color and enum controls.
- Variant selection and per-variant overrides.
- Theme/accent controls.
- Clip timing/lane metadata and relevant actions.

AI assistant target:
- Conversation area with project-aware suggestions.
- Clearly labeled AI-generated recommendations.
- Quick actions such as “make more minimal”, “increase contrast” or “shorten animation” only when backed by a real project mutation workflow.
- Accept/reject/undo affordances for every proposed edit.

Rules:
- Inspector values must be driven by the selected clip in the canonical Project store.
- Parameter edits must update the project store and immediately refresh preview.
- Do not create local duplicate copies of clip params as the source of truth.
- AI suggestions must be proposals until explicitly accepted.
- Avoid fake AI chat, fabricated credit counters or decorative controls without behavior.

Current implementation note: App imports an Inspector component, but it was not present in the last component inventory. Build the first Inspector as a manifest-driven parameter editor before adding AI chat or variant UI.

## 7. Bottom — Timeline

The timeline spans the full application width.

Toolbar:
- Timeline label and editing tools.
- Selection, split/link or other tools only when implemented.
- Timecode display.
- Zoom controls and optional A/B compare.

Ruler:
- Time ticks and labels.
- Click/drag scrubbing.
- Markers and playhead.

Track header/controls:
- Video/scene tracks.
- Audio track with waveform.
- Caption/word track.
- One or more overlay tracks.
- Track visibility, mute, lock and selection controls only when functional.

Track content:
- Audio waveform with duration aligned to project time.
- Word-level caption blocks positioned from word start/end timestamps.
- Scene and overlay clip blocks positioned from resolved word anchors.
- Clip labels and selected state.
- Markers and playhead aligned with preview.

Behavior:
- One shared playback clock (playbackStore).
- Clicking ruler seeks.
- Selecting a clip updates selectedClipId and Inspector.
- Clip positions are derived from word anchors via `src/lib/anchors.ts`.
- Timeline zoom changes pixels-per-second, not underlying project timing.
- Dragging/resizing clips must update anchors through explicit store actions; do not store a second absolute-time representation unless a documented conversion layer is introduced.

Current implementation note: Timeline is not implemented/verified yet. The sample project contains a caption overlay and fact-card overlay but no scene clips.

## 8. Responsive behavior

Primary target is desktop, not mobile.
- At narrower desktop widths, allow side panels to collapse or become resizable.
- Keep the center preview usable; do not let side panels consume all width.
- Timeline should retain horizontal scrolling and a usable track header.
- Avoid making the entire document scroll; each workspace region should manage its own overflow.

## 9. Implementation order

1. Establish shell grid proportions and visual tokens to match the reference.
2. Complete Material Library search/filter/selection states.
3. Build Inspector parameter editor driven by selected clip and manifest.
4. Build Timeline ruler, tracks, captions, clips, selection and scrubbing.
5. Improve preview sizing, guides and transport integration.
6. Add real persistence/dirty state before presenting autosave as active.
7. Add variants and compare only after variant data/actions are real.
8. Add AI assistant as an approval-based project action layer.
9. Integrate render queue and export when native rendering is operational.

## 10. Acceptance criteria

The editor shell visually follows the supplied reference:
- Global toolbar is compact and full width.
- Left library, center preview, right inspector are visible simultaneously.
- Timeline spans the full bottom width.
- Dark theme and restrained purple/amber accents are consistent.
- Preview remains centered and scaled correctly.
- Selecting a clip can drive Inspector and preview state from the same project data.
- No fake status, credit, autosave, AI or render functionality is presented as operational.
