# ClipForge — Architecture Decision Log

Record decisions that materially constrain future implementation. Add new entries rather than silently rewriting history.

## D001 — Project document is the source of truth
- **Status:** Accepted
- **Decision:** The serialized Project object is canonical for UI editing, AI operations and rendering.
- **Reason:** Prevents UI, AI and renderer from maintaining divergent project representations.
- **Consequence:** Mutations must be explicit project/store operations; renderer consumes a project snapshot.

## D002 — Word anchors define clip timing
- **Status:** Accepted
- **Decision:** Clips reference word indexes and word edges, with optional second offsets.
- **Reason:** Re-alignment or re-recording can move clips with subtitle timing.
- **Consequence:** Resolve absolute seconds at preview/render time through `src/lib/anchors.ts`. Keep the word-index validity/fallback behavior in mind when words change.

## D003 — Templates are HTML documents with manifests
- **Status:** Accepted
- **Decision:** Each template is an independently hosted HTML entry point with a JSON manifest describing parameters and runtime metadata.
- **Reason:** Templates can be authored and previewed independently from the React application.
- **Consequence:** Keep the manifest/index and browser runtime contract synchronized.

## D004 — One shared playback clock
- **Status:** Accepted
- **Decision:** `playbackStore` owns project time; template iframes receive derived local time.
- **Reason:** Overlapping templates must stay synchronized.
- **Consequence:** Do not create per-component playback timers or independent iframe clocks.

## D005 — Desktop shell uses Tauri 2
- **Status:** Accepted
- **Decision:** Tauri 2 hosts the React/Vite frontend and will own native file/process capabilities.
- **Reason:** Desktop distribution and local media/render workflows.
- **Consequence:** Validate native commands and filesystem paths at the Rust boundary.

## D006 — Render pipeline uses a Node sidecar and FFmpeg (planned)
- **Status:** Proposed direction
- **Decision:** Use headless Chromium to render template frames and FFmpeg to encode/composite output.
- **Reason:** Reuse the HTML template system and access mature media encoding.
- **Consequence:** The pipeline is not yet complete. Validate performance, alpha handling, process lifecycle and packaging before treating this as final.
