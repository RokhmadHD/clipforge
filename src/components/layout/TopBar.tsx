import { useRef, useState } from "react";
import { parseProjectFile } from "../../lib/projectFile";
import { parseSubtitleFile } from "../../lib/subtitles";
import { saveCurrentProject } from "../../lib/useHotkeys";
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
  const setProject = useProjectStore((s) => s.setProject);
  const setWords = useProjectStore((s) => s.setWords);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const jobs = useRenderStore((s) => s.jobs.length);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

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

  const importSubtitles = async (file: File) => {
    try {
      const result = parseSubtitleFile(file.name, await file.text());
      if (result.ok) {
        setWords(result.words);
        setSubtitleError(null);
      } else {
        setSubtitleError(result.error);
      }
    } catch {
      setSubtitleError("Gagal membaca file subtitle.");
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
        {subtitleError
          ? <span className="save-error" role="alert">{subtitleError}</span>
          : openError
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
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".srt,.vtt,.txt,.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importSubtitles(file);
          event.currentTarget.value = "";
        }}
      />
      <button
        className="btn"
        onClick={() => subtitleInputRef.current?.click()}
        title="Impor subtitle .srt / .vtt / .json sebagai kata proyek"
      >
        Subjudul
      </button>
      <button className="btn" onClick={() => saveCurrentProject()} title="Unduh proyek sebagai .clipforge.json (Ctrl/Cmd+S)">
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
