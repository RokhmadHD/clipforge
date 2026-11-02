import { useEffect } from "react";
import { downloadProjectFile } from "./projectFile";
import { useProjectStore } from "../stores/projectStore";

/** True when keyboard focus is in an editable field where shortcuts must not fire. */
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
};

/**
 * Shared save action: writes the current project to disk and clears the dirty
 * flag. Used by BOTH the "Simpan" button in TopBar and the Ctrl/Cmd+S hotkey
 * below, so the two never drift apart.
 */
export function saveCurrentProject(): void {
  const { project, markSaved } = useProjectStore.getState();
  downloadProjectFile(project);
  markSaved();
}

interface Hotkeys {
  undo: () => void;
  redo: () => void;
}

/**
 * Global keyboard shortcuts:
 * Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z and Ctrl+Y = redo,
 * Ctrl/Cmd+S = save the project (same handler as the Simpan button).
 * Ignored while focus is in input, textarea, select or contenteditable elements.
 */
export function useHotkeys({ undo, redo }: Hotkeys): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "s") {
        e.preventDefault();
        saveCurrentProject();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);
}
