import { beforeEach, describe, expect, it } from "vitest";
import { LAYOUT_DEFAULTS, LAYOUT_LIMITS, useUiStore } from "./uiStore";

describe("uiStore panel layout setters", () => {
  beforeEach(() => {
    useUiStore.setState({
      libraryWidth: LAYOUT_DEFAULTS.libraryWidth,
      inspectorWidth: LAYOUT_DEFAULTS.inspectorWidth,
      timelineHeight: LAYOUT_DEFAULTS.timelineHeight,
    });
  });

  it("clamps panel sizes into the configured limits", () => {
    useUiStore.getState().setLibraryWidth(50);
    expect(useUiStore.getState().libraryWidth).toBe(LAYOUT_LIMITS.libraryWidth[0]);
    useUiStore.getState().setLibraryWidth(2000);
    expect(useUiStore.getState().libraryWidth).toBe(LAYOUT_LIMITS.libraryWidth[1]);
    useUiStore.getState().setInspectorWidth(10);
    expect(useUiStore.getState().inspectorWidth).toBe(LAYOUT_LIMITS.inspectorWidth[0]);
    useUiStore.getState().setTimelineHeight(2000);
    expect(useUiStore.getState().timelineHeight).toBe(LAYOUT_LIMITS.timelineHeight[1]);
  });

  it("accepts in-range values", () => {
    useUiStore.getState().setLibraryWidth(360);
    expect(useUiStore.getState().libraryWidth).toBe(360);
  });
});
