# ClipForge — Template Runtime Contract

This document defines the interface between the React preview and standalone HTML templates. Keep preview and offline renderer behavior aligned.

## Directory layout

```text
public/templates/
  <template-id>/
    manifest.json
    index.html
  index.json                 # generated; do not hand-edit
```

The folder name and manifest `id` must match.

## Manifest

Each manifest is a `TemplateManifest`:
- `id`: stable identifier matching the folder.
- `name`: display name.
- `kind`: `scene` or `overlay`.
- `size`: [width, height].
- `fps`: template frame rate.
- `defaultDuration`: fallback duration in seconds.
- `needsWords`: optional; when true, receive word timing data.
- `params`: named parameter specs.

Supported parameter types in `src/types/template.ts`:
- `text`: optional multiline/default.
- `color`: color string/default.
- `number`: optional min/max/step/default.
- `enum`: string values and optional default.

The frontend merges each parameter's `default` with the clip's explicit `params`; explicit clip values win.

## URL query parameters

The frontend builds the template URL through `buildTemplateUrl()` in `src/lib/templates.ts`.

| Query | Value | Required |
|---|---|---|
| `p` | JSON object of resolved template params | Yes |
| `theme` | JSON object of CSS theme tokens | Yes |
| `d` | Clip duration in seconds | Yes |
| `w` | JSON array of words with times relative to clip start | Only when manifest `needsWords` is true |

A word item has `text`, `start` and `end`. Times are seconds relative to the clip's start, not absolute project time.

## Window API

A template must expose:
- `window.__ready: Promise<void>` — resolves when the template has completed initialization and can accept seeks.
- `window.__seek(t: number): void` — updates the visual state to the supplied template-local time in seconds.

The parent preview waits for `__ready` and calls `__seek`. It also calls `__seek` as the project playhead changes.

Requirements:
- `__seek` must be deterministic and safe to call repeatedly or out of order.
- It must not assume that time always moves forward.
- Clamp or gracefully handle values outside [0, duration].
- Do not rely only on a self-running animation clock for correctness.
- Initialize a useful first frame before resolving `__ready`.
- Keep templates transparent when used as overlays unless an opaque background is intentional.

## Security and isolation

The preview currently uses an iframe sandbox with `allow-scripts allow-same-origin` because the parent calls the template's window API. This combination gives same-origin script access and weakens sandbox isolation; it is acceptable only while templates are trusted, bundled local project code. Do not load untrusted third-party templates under this assumption.

Before supporting downloaded/community templates, design a stronger message-based bridge (for example, `postMessage` with strict origin/source checks) and remove unnecessary sandbox permissions. Never treat template HTML as trusted merely because it is a template.

## Index generation

After adding or changing a manifest:

```bash
npm run templates:index
```

The generated `public/templates/index.json` is runtime input. Do not edit it manually; edit manifests and regenerate it.

## Current templates

- `caption-karaoke`: overlay; consumes word timing data.
- `fact-card`: overlay; accepts title/body and visual style parameters.

See their manifests and HTML files for concrete examples.
