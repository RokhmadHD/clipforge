# ClipForge — Project Brief

## Product

ClipForge is a desktop-first, AI-assisted editor for short-form videos. The intended workflow is to build a video from audio, word-level subtitle timing, reusable visual templates, themes and variants, then render one or more outputs.

The product should make it possible to create and revise structured video projects without manually keyframing every visual element.

## Core concepts

- **Project:** canonical document containing metadata, audio, aligned words, assets, themes, scenes, overlays and variants.
- **Word:** subtitle token with absolute start/end timestamps on the audio timeline.
- **Word anchor:** reference to a word's start or end edge, with an optional time offset.
- **Clip:** one use of a template, positioned by two word anchors and assigned to a timeline lane.
- **Scene:** full-frame visual layer (planned; current sample has no scenes).
- **Overlay:** transparent visual layer composited above scenes, such as captions, fact cards or CTA.
- **Template:** reusable HTML experience with a manifest describing its parameters and runtime metadata.
- **Theme:** CSS token map injected into templates.
- **Variant:** an output configuration using a theme and optional per-clip parameter overrides.
- **Render job:** one requested output, eventually processed by the native render queue and renderer sidecar.

## Intended user flow

1. Create/open a project and import audio/media.
2. Generate or import word-aligned subtitles.
3. Add scenes and overlays from the template library.
4. Arrange clips on a timeline using word anchors.
5. Customize template parameters in the Inspector.
6. Preview playback with synchronized template layers.
7. Create variants and render final videos.
8. Save/reopen project files and iterate.

This is the intended direction, not a claim that all steps are currently implemented.

## Product principles

- Local-first desktop application.
- Project data is structured and portable.
- Word alignment is the primary timing reference.
- Templates are reusable and independently previewable.
- AI should operate on explicit project data and controlled actions, not hidden UI state.
- Rendering should be reproducible from a project plus its assets/templates.
- Keep the initial implementation small and understandable for a solo developer.

## Current scope

The immediate milestone is the editor shell: layout, template library, preview, Inspector and timeline. Import, persistence, AI workflows, variants and production rendering follow in later milestones.

See [STATUS.md](STATUS.md) and [ROADMAP.md](ROADMAP.md) for verified progress.
