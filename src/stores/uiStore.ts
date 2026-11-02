import { create } from "zustand";
import {
  createLocalStorage,
  LAYOUT_STORAGE_KEY,
  loadLayout,
  saveLayout,
  type LayoutStorage,
  type LayoutValues,
} from "../lib/layoutStorage";

export type Mode = "assets" | "storyboard" | "editor";

/** Layout limits keep the center preview usable at any panel size. */
export const LAYOUT_DEFAULTS = { libraryWidth: 280, inspectorWidth: 320, timelineHeight: 260 } as const;
export const LAYOUT_LIMITS = {
  libraryWidth: [200, 440],
  inspectorWidth: [240, 480],
  timelineHeight: [150, 420],
} as const;

const clamp = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(Math.max(value, min), max);

interface UiState {
  mode: Mode;
  setMode: (m: Mode) => void;
  libraryWidth: number;
  inspectorWidth: number;
  timelineHeight: number;
  setLibraryWidth: (width: number) => void;
  setInspectorWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
}

const pickLayout = (state: Pick<UiState, keyof LayoutValues>): LayoutValues => ({
  libraryWidth: state.libraryWidth,
  inspectorWidth: state.inspectorWidth,
  timelineHeight: state.timelineHeight,
});

/**
 * Restore a persisted layout, clamping every value into LAYOUT_LIMITS and
 * falling back to LAYOUT_DEFAULTS for anything missing or out of range.
 */
const loadInitialLayout = (storage: LayoutStorage): LayoutValues => {
  const persisted = loadLayout(storage, LAYOUT_STORAGE_KEY);
  return {
    libraryWidth:
      persisted.libraryWidth !== undefined
        ? clamp(persisted.libraryWidth, LAYOUT_LIMITS.libraryWidth)
        : LAYOUT_DEFAULTS.libraryWidth,
    inspectorWidth:
      persisted.inspectorWidth !== undefined
        ? clamp(persisted.inspectorWidth, LAYOUT_LIMITS.inspectorWidth)
        : LAYOUT_DEFAULTS.inspectorWidth,
    timelineHeight:
      persisted.timelineHeight !== undefined
        ? clamp(persisted.timelineHeight, LAYOUT_LIMITS.timelineHeight)
        : LAYOUT_DEFAULTS.timelineHeight,
  };
};

/** Create the UI store with an injectable layout storage backend. */
export const createUiStore = (storage: LayoutStorage = createLocalStorage()) => {
  const persist = (layout: LayoutValues) => saveLayout(storage, LAYOUT_STORAGE_KEY, layout);
  return create<UiState>((set, get) => ({
    mode: "editor",
    setMode: (mode) => set({ mode }),
    ...loadInitialLayout(storage),
    setLibraryWidth: (libraryWidth) => {
      const value = clamp(libraryWidth, LAYOUT_LIMITS.libraryWidth);
      persist({ ...pickLayout(get()), libraryWidth: value });
      set({ libraryWidth: value });
    },
    setInspectorWidth: (inspectorWidth) => {
      const value = clamp(inspectorWidth, LAYOUT_LIMITS.inspectorWidth);
      persist({ ...pickLayout(get()), inspectorWidth: value });
      set({ inspectorWidth: value });
    },
    setTimelineHeight: (timelineHeight) => {
      const value = clamp(timelineHeight, LAYOUT_LIMITS.timelineHeight);
      persist({ ...pickLayout(get()), timelineHeight: value });
      set({ timelineHeight: value });
    },
  }));
};

/** Default store used by the app, backed by localStorage. */
export const useUiStore = createUiStore();
