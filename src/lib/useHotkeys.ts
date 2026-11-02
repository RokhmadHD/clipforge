import { useEffect } from "react";

/** True when keyboard focus is in an editable field where shortcuts must not fire. */
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
};

interface Hotkeys {
  undo: () => void;
  redo: () => void;
}

/**
 * Global undo/redo keyboard shortcuts:
 * Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z and Ctrl+Y = redo.
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);
}
