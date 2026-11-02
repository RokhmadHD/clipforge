---
inclusion: always
---

# ClipForge project guidance

The canonical project instructions are in `AGENTS.md`. Read it before making changes.

For project context, read:
- `docs/STATUS.md` — verified current state and next steps.
- `docs/PROJECT_BRIEF.md` — product purpose and concepts.
- `docs/ARCHITECTURE.md` — system design and state ownership.
- `docs/TEMPLATE_CONTRACT.md` — HTML template runtime contract.

Inspect source before trusting documentation. Keep the serialized `Project` as the source of truth, use `playbackStore` as the only playback clock, preserve word-anchor timing, and do not claim planned/TODO features are implemented. Run relevant checks and update status after changes.
