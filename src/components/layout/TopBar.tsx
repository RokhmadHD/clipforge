import { useRef, useState } from "react";
import { downloadProjectFile, parseProjectFile } from "../../lib/projectFile";
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
  const dirty = useProjectStore((s) => s.dirty);
  const markSaved = useProjectStore((s) => s.markSaved);
  const setProject = useProjectStore((s) => s.setProject);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const jobs = useRenderStore((s) => s.jobs.length);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const openFile = async (file: File) => {
    try {
      const result = parseProjectFile(await file.text());
      if (result.ok) {
        setProject(result.project);
        setOpenError(null);
      } else {
        setOpenError(result.error);
      }
    } catch {
      setOpenError("Gagal membaca file proyek.");
    }
  };

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark">▶</span>
        ClipForge
      </div>
      <span className="project-name">
        {name}
        {dirty && <span className="dirty-dot" title="Perubahan belum disimpan" aria-label="Perubahan belum disimpan" />}
      </span>

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
      <span className="save-state" role="status">
        {openError
          ? <span className="save-error" role="alert">{openError}</span>
          : dirty
            ? "Belum disimpan"
            : "Tersimpan"}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".clipforge.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void openFile(file);
          event.currentTarget.value = "";
        }}
      />
      <button className="btn" onClick={() => fileInputRef.current?.click()} title="Buka file proyek .clipforge.json">
        Buka
      </button>
      <button
        className="btn"
        onClick={() => {
          downloadProjectFile(useProjectStore.getState().project);
          markSaved();
        }}
        title="Unduh proyek sebagai .clipforge.json"
      >
        Simpan
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
