import { useProjectStore } from "../../stores/projectStore";
import { useRenderStore } from "../../stores/renderStore";
import { useUiStore, type Mode } from "../../stores/uiStore";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "assets", label: "Aset" },
  { id: "storyboard", label: "Storyboard" },
  { id: "editor", label: "Editor" },
];

export function TopBar() {
  const name = useProjectStore((s) => s.project.meta.name);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const jobs = useRenderStore((s) => s.jobs.length);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark">▶</span>
        ClipForge
      </div>
      <span className="project-name">{name}</span>

      <nav className="tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`tab ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>

      <span className="spacer" />
      <button className="btn small" disabled={!canUndo} onClick={undo} title="Undo (Ctrl/Cmd+Z)">
        ↶ Undo
      </button>
      <button className="btn small" disabled={!canRedo} onClick={redo} title="Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)">
        ↷ Redo
      </button>
      <button className="btn" disabled title="Antrean render: milestone M1/M4">
        Render Queue ({jobs})
      </button>
      <button className="btn primary" disabled title="Export: milestone M1">
        Export
      </button>
    </header>
  );
}
