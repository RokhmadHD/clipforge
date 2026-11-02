# ClipForge

Desktop-first, AI-assisted short-video editor built with Tauri 2, React, TypeScript and Vite.

## Start here

- [Agent instructions](AGENTS.md) — required workflow and coding rules for AI agents.
- [Session handoff](docs/SESSION_HANDOFF.md) — compact context for switching AI models or sessions.
- [Current status](docs/STATUS.md) — verified implementation state, validation and next tasks.
- [Project brief](docs/PROJECT_BRIEF.md) — product purpose and core concepts.
- [Architecture](docs/ARCHITECTURE.md) — frontend, state, templates, native layer and render direction.
- [UI specification](docs/UI_SPEC.md) — target layout and behavior based on the supplied mockup.
- [Template contract](docs/TEMPLATE_CONTRACT.md) — manifest and HTML runtime interface.
- [Roadmap](docs/ROADMAP.md) — milestones and planned work.
- [Decision log](docs/DECISIONS.md) — accepted/proposed architecture decisions.

## Stack

- Tauri 2 + Rust
- React 19 + TypeScript
- Vite
- Zustand
- HTML/CSS/JavaScript templates
- Planned renderer: Node sidecar, headless Chromium and FFmpeg

## Requirements

- Node.js and npm
- Rust toolchain and platform dependencies for Tauri development
- FFmpeg is required for the intended final render workflow; the current editor shell does not imply the full render pipeline is integrated.

## Setup

```bash
npm install
npm run templates:index
npm run dev
```

For the desktop app, once native prerequisites are installed:

```bash
npm run tauri:dev
```

## Validation

```bash
npm run templates:index
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Only treat a check as passing after it has actually been run. See [docs/STATUS.md](docs/STATUS.md) for the latest verified results.

## Template development

Create a folder under `public/templates/<template-id>/` with `manifest.json` and `index.html`. Follow [docs/TEMPLATE_CONTRACT.md](docs/TEMPLATE_CONTRACT.md), then run:

```bash
npm run templates:index
```

## Project state

The application currently contains a sample project and an early editor shell. Import, persistence, full Inspector/Timeline workflows, AI integration and production rendering are still under development. Do not assume the roadmap describes completed features.
