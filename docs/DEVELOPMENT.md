# Development Guide

## Local setup

Check the installed toolchain before installing anything:

```bash
node --version
npm --version
rustc --version
cargo --version
```

Install frontend dependencies:

```bash
npm install
```

Generate the template index and start Vite:

```bash
npm run templates:index
npm run dev
```

Vite is configured to use port 1420 with strict port binding because Tauri expects that URL.

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run templates:index` | Regenerate `public/templates/index.json` from template manifests. |
| `npm run dev` | Start Vite development server. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run build` | Typecheck and build the frontend. |
| `npm run preview` | Preview the built frontend. |
| `npm run tauri:dev` | Run the Tauri desktop app in development. |
| `npm run tauri:build` | Build the Tauri application. |
| `npm run render:sample` | Attempt the sample Node renderer command; verify its prerequisites first. |

## Project layout

```text
src/
  components/   React UI
  lib/          domain helpers and playback loop
  stores/       Zustand state
  styles/       global styles and design tokens
  types/        shared TypeScript models
public/
  templates/    standalone HTML templates and manifests
renderer/       Node-side rendering code
scripts/        project maintenance scripts
src-tauri/      Tauri configuration and Rust code
docs/           product, architecture and handoff documentation
```

## Change workflow

1. Read [AGENTS.md](../AGENTS.md) and [STATUS.md](STATUS.md).
2. Inspect the relevant implementation and all call sites.
3. Make a focused change.
4. Regenerate the template index if a manifest changed.
5. Run typecheck/build or the narrowest meaningful test.
6. Update status and architecture docs when needed.

## Environment and secrets

- Keep machine-specific values out of source control.
- Keep credentials in local environment configuration; never commit them.
- Do not add broad filesystem or shell permissions to Tauri without documenting why.
- Validate paths and process arguments in Rust before native file/process operations.
- Do not load untrusted template HTML in the current same-origin iframe preview model.
