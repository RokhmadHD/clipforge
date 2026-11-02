import { create } from "zustand";

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

export const useUiStore = create<UiState>((set) => ({
  mode: "editor",
  setMode: (mode) => set({ mode }),
  libraryWidth: LAYOUT_DEFAULTS.libraryWidth,
  inspectorWidth: LAYOUT_DEFAULTS.inspectorWidth,
  timelineHeight: LAYOUT_DEFAULTS.timelineHeight,
  setLibraryWidth: (libraryWidth) => set({ libraryWidth: clamp(libraryWidth, LAYOUT_LIMITS.libraryWidth) }),
  setInspectorWidth: (inspectorWidth) => set({ inspectorWidth: clamp(inspectorWidth, LAYOUT_LIMITS.inspectorWidth) }),
  setTimelineHeight: (timelineHeight) => set({ timelineHeight: clamp(timelineHeight, LAYOUT_LIMITS.timelineHeight) }),
}));
