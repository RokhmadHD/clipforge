import { beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryLayoutStorage,
  LAYOUT_STORAGE_KEY,
  type LayoutStorage,
} from "../lib/layoutStorage";
import {
  createUiStore,
  LAYOUT_DEFAULTS,
  LAYOUT_LIMITS,
  useUiStore,
} from "./uiStore";

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

describe("uiStore audioPeaks (display cache, not persisted)", () => {
  it("sets and clears the waveform peaks", () => {
    const peaks = [0.1, 0.5, 1, 0.3];
    useUiStore.getState().setAudioPeaks(peaks);
    expect(useUiStore.getState().audioPeaks).toEqual(peaks);
    useUiStore.getState().setAudioPeaks(null);
    expect(useUiStore.getState().audioPeaks).toBeNull();
  });

  it("replaces previous peaks on a new import", () => {
    useUiStore.getState().setAudioPeaks([0.2]);
    useUiStore.getState().setAudioPeaks([0.9, 0.4]);
    expect(useUiStore.getState().audioPeaks).toEqual([0.9, 0.4]);
  });

  it("never writes audioPeaks into layout persistence storage", () => {
    const storage = createInMemoryLayoutStorage();
    const store = createUiStore(storage);
    store.getState().setAudioPeaks([0.1, 0.9]);
    expect(store.getState().audioPeaks).toEqual([0.1, 0.9]);
    const raw = storage.getItem(LAYOUT_STORAGE_KEY);
    expect(raw).toBeNull(); // setAudioPeaks must not trigger persist
    // and even after a real layout write, the payload stays layout-only
    store.getState().setLibraryWidth(360);
    expect(Object.keys(JSON.parse(storage.getItem(LAYOUT_STORAGE_KEY) as string))).toEqual([
      "libraryWidth",
      "inspectorWidth",
      "timelineHeight",
    ]);
  });
});

describe("uiStore layout persistence", () => {
  it("persists layout values on every setter call", () => {
    const storage = createInMemoryLayoutStorage();
    const store = createUiStore(storage);
    store.getState().setLibraryWidth(360);
    store.getState().setTimelineHeight(300);
    expect(JSON.parse(storage.getItem(LAYOUT_STORAGE_KEY) as string)).toEqual({
      libraryWidth: 360,
      inspectorWidth: LAYOUT_DEFAULTS.inspectorWidth,
      timelineHeight: 300,
    });
  });

  it("stores clamped values on setter calls", () => {
    const storage = createInMemoryLayoutStorage();
    const store = createUiStore(storage);
    store.getState().setLibraryWidth(2000);
    expect(JSON.parse(storage.getItem(LAYOUT_STORAGE_KEY) as string).libraryWidth).toBe(
      LAYOUT_LIMITS.libraryWidth[1],
    );
  });

  it("loads persisted values when the store is created", () => {
    const storage = createInMemoryLayoutStorage();
    storage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ libraryWidth: 400, inspectorWidth: 460, timelineHeight: 200 }),
    );
    const store = createUiStore(storage);
    expect(store.getState().libraryWidth).toBe(400);
    expect(store.getState().inspectorWidth).toBe(460);
    expect(store.getState().timelineHeight).toBe(200);
  });

  it("clamps out-of-range persisted values into the limits", () => {
    const storage = createInMemoryLayoutStorage();
    storage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ libraryWidth: 5000, inspectorWidth: 1, timelineHeight: -20 }),
    );
    const store = createUiStore(storage);
    expect(store.getState().libraryWidth).toBe(LAYOUT_LIMITS.libraryWidth[1]);
    expect(store.getState().inspectorWidth).toBe(LAYOUT_LIMITS.inspectorWidth[0]);
    expect(store.getState().timelineHeight).toBe(LAYOUT_LIMITS.timelineHeight[0]);
  });

  it("falls back to defaults on corrupt JSON or missing fields", () => {
    const corruptStorage = createInMemoryLayoutStorage();
    corruptStorage.setItem(LAYOUT_STORAGE_KEY, "{definitely not json");
    const corruptStore = createUiStore(corruptStorage);
    expect(corruptStore.getState().libraryWidth).toBe(LAYOUT_DEFAULTS.libraryWidth);
    expect(corruptStore.getState().inspectorWidth).toBe(LAYOUT_DEFAULTS.inspectorWidth);
    expect(corruptStore.getState().timelineHeight).toBe(LAYOUT_DEFAULTS.timelineHeight);

    const partialStorage = createInMemoryLayoutStorage();
    partialStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ timelineHeight: 300 }));
    const partialStore = createUiStore(partialStorage);
    expect(partialStore.getState().libraryWidth).toBe(LAYOUT_DEFAULTS.libraryWidth);
    expect(partialStore.getState().inspectorWidth).toBe(LAYOUT_DEFAULTS.inspectorWidth);
    expect(partialStore.getState().timelineHeight).toBe(300);
  });

  it("swallows save failures without throwing and keeps state usable", () => {
    const failingStorage: LayoutStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    const store = createUiStore(failingStorage);
    expect(() => store.getState().setLibraryWidth(360)).not.toThrow();
    expect(store.getState().libraryWidth).toBe(360);
    expect(() => store.getState().setTimelineHeight(310)).not.toThrow();
    expect(store.getState().timelineHeight).toBe(310);
  });
});
