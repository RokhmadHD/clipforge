# ClipForge — Architecture

## High-level shape

```text
React UI (Vite)
  ├─ Layout / Template Library / Preview / Inspector / Timeline
  ├─ Zustand stores
  │    ├─ projectStore  → canonical Project document
  │    ├─ playbackStore → shared playhead clock
  │    ├─ templateStore → loaded template manifests
  │    ├─ uiStore       → active workspace mode
  │    └─ renderStore   → in-memory render job view (placeholder)
  └─ Tauri 2 bridge
       └─ Rust commands / future render queue
            └─ Node renderer sidecar (planned integration)
                 ├─ Headless Chromium → template frames
                 └─ FFmpeg → encoded video
```

## Frontend

- Entry: `src/main.tsx` → `src/App.tsx`.
- UI components: `src/components/`.
- Domain helpers: `src/lib/`.
- Zustand state: `src/stores/`.
- Shared types: `src/types/`.
- Styles: `src/styles/`.

### State ownership

| Store | Responsibility |
|---|---|
| `projectStore` | Project document, selected clip, clip parameter updates. |
| `playbackStore` | Current time, playing state, duration, seek and tick. |
| `templateStore` | Manifest list, load status/error and lookup by ID. |
| `uiStore` | Current mode: assets, storyboard or editor. |
| `renderStore` | Render job list; currently only local upsert behavior. |

Avoid duplicating state. Components should derive display values from these stores and pure helpers.

## Project model

Defined in `src/types/project.ts`.

A Project currently contains:
- versioned metadata (name, width, height, fps),
- optional audio path/duration,
- aligned words with absolute audio timestamps,
- assets,
- themes and active theme ID,
- scene clips,
- overlay clips,
- variants.

A Clip references a template ID, parameter map, start/end word anchors and a lane. `PROJECT_VERSION` is 1. Breaking schema changes require a version bump and migration plan.

### Timing

`src/lib/anchors.ts` resolves word anchors into seconds at runtime. This lets clips follow re-aligned subtitle words. The playback store is the only playhead clock. Template-local time is computed as:

`localTime = projectTime - resolvedClipStart`

Clamp local time to a valid non-negative value before seeking a template.

## Template system

Each template is a folder under `public/templates/<template-id>/` with an HTML entry point and `manifest.json`. The index is generated into `public/templates/index.json` by `npm run templates:index`.

The manifest describes template ID, name, kind, dimensions, FPS, default duration, optional word-data requirement and typed parameter specifications.

At runtime, the frontend:
1. Loads the generated template index.
2. Merges manifest defaults with clip parameter overrides.
3. Resolves clip anchors.
4. Selects subtitle words in the clip window when `needsWords` is true.
5. Builds a template URL with serialized params/theme/duration/words.
6. Mounts active templates in iframes and calls their `__seek` function as the playhead changes.

See [TEMPLATE_CONTRACT.md](TEMPLATE_CONTRACT.md) for the exact browser interface.

## Native layer

Tauri configuration is in `src-tauri/tauri.conf.json`.
- Current registered command: `app_info`.
- `src-tauri/src/render.rs` defines a serializable RenderJob model only.
- No verified render queue, sidecar lifecycle, cancellation, or progress-event implementation exists yet.

Keep native commands narrow and validate all frontend-supplied paths and arguments in Rust. Never assume frontend validation is a security boundary.

## Render pipeline — intended design

The intended pipeline is:
1. Receive a project snapshot and selected variant.
2. Resolve word anchors to absolute clip times.
3. Render each template at deterministic timestamps in headless Chromium.
4. Composite transparent layers and scene output in a defined z/lane order.
5. Encode the result with FFmpeg.
6. Emit job status/progress to the Tauri frontend.
7. Support cancellation and clear failure reporting.

This pipeline is a design direction, not a verified complete feature. Before implementation, define frame format, alpha handling, asset URL/path policy, audio muxing, FPS rounding, process cleanup and cache invalidation.

## Key constraints

- Keep project state serializable and independent from React component state.
- Do not use the UI preview as the sole rendering implementation; both preview and renderer must follow the same template contract.
- Keep template time deterministic and seekable.
- Treat local file paths and sidecar process arguments as untrusted inputs at the native boundary.
- Document schema migrations when changing project serialization.
