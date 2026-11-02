import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "./projectStore";
import { createSampleProject } from "../lib/sampleProject";
import { createHistory } from "../lib/history";
import type { TemplateManifest } from "../types/template";
import type { Word } from "../types/project";

const overlayTemplate: TemplateManifest = {
  id: "fact-card",
  name: "Fact Card",
  kind: "overlay",
  size: [1080, 1920],
  fps: 30,
  defaultDuration: 2.2,
  params: { title: { type: "text", default: "1883" } },
};

const sceneTemplate: TemplateManifest = {
  id: "scene-demo",
  name: "Scene Demo",
  kind: "scene",
  size: [1080, 1920],
  fps: 30,
  defaultDuration: 1,
  params: {},
};

const reset = () => {
  const sample = createSampleProject();
  useProjectStore.setState({
    project: sample,
    selectedClipId: "clip-fact-1883",
    history: createHistory(sample),
    lastSaved: sample,
    dirty: false,
    canUndo: false,
    canRedo: false,
  });
};

const state = () => useProjectStore.getState();

describe("projectStore.setClipParam", () => {
  beforeEach(reset);

  it("updates the parameter on the selected clip without touching others", () => {
    state().setClipParam("clip-fact-1883", "title", "Krakatau");
    const clip = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(clip?.params.title).toBe("Krakatau");
    expect(state().project.overlays.find((c) => c.id === "clip-captions")?.params).toEqual({});
  });
});

describe("projectStore.addClip", () => {
  beforeEach(reset);

  it("inserts an overlay near the given word with defaults and selects it", () => {
    const id = state().addClip(overlayTemplate, 6);
    expect(id).not.toBeNull();
    const clip = state().project.overlays.find((c) => c.id === id);
    expect(clip?.template).toBe("fact-card");
    expect(clip?.from).toEqual({ word: 6, edge: "start" });
    // words 6..10 span 3.6s..6.5s which fits the requested 2.2s window from word 6 (3.6 -> 5.8)
    expect(clip?.to.word).toBe(8);
    expect(state().selectedClipId).toBe(id);
  });

  it("picks a free lane instead of stacking on an occupied one", () => {
    // word 6..10 is exactly where clip-fact-1883 (lane 1) lives, captions occupy lane 0 up to word 12
    const id = state().addClip(overlayTemplate, 6);
    const clip = state().project.overlays.find((c) => c.id === id);
    // both visible lanes are occupied -> clamps to max lane 1
    expect(clip?.lane).toBe(1);
  });

  it("appends a scene clip after the last existing scene", () => {
    const firstId = state().addClip(sceneTemplate, 0);
    const first = state().project.scenes.find((c) => c.id === firstId);
    expect(first).toBeDefined();
    const secondId = state().addClip(sceneTemplate, 0);
    const second = state().project.scenes.find((c) => c.id === secondId);
    expect(second?.from).toEqual({ word: first?.to.word, edge: first?.to.edge });
  });

  it("returns null when the project has no words", () => {
    const project = createSampleProject();
    project.words = [];
    useProjectStore.setState({ project });
    expect(state().addClip(overlayTemplate, 0)).toBeNull();
  });
});

describe("projectStore.deleteClip", () => {
  beforeEach(reset);

  it("removes the clip and clears selection when it was selected", () => {
    state().deleteClip("clip-fact-1883");
    expect(state().project.overlays.some((c) => c.id === "clip-fact-1883")).toBe(false);
    expect(state().selectedClipId).toBeNull();
  });

  it("keeps selection when another clip is deleted", () => {
    state().selectClip("clip-fact-1883");
    state().deleteClip("clip-captions");
    expect(state().selectedClipId).toBe("clip-fact-1883");
  });
});

describe("projectStore.duplicateClip", () => {
  beforeEach(reset);

  it("copies params and selects the duplicate", () => {
    state().setClipParam("clip-fact-1883", "title", "Custom");
    state().duplicateClip("clip-fact-1883");
    const copy = state().project.overlays.find((c) => c.id === "clip-fact-card");
    expect(copy?.params.title).toBe("Custom");
    expect(state().selectedClipId).toBe("clip-fact-card");
    // original stays untouched
    expect(state().project.overlays.some((c) => c.id === "clip-fact-1883")).toBe(true);
  });

  it("duplicates scene clips into the scenes track", () => {
    const id = state().addClip(sceneTemplate, 0);
    state().duplicateClip(id!);
    expect(state().project.scenes.filter((c) => c.template === "scene-demo")).toHaveLength(2);
  });
});

describe("projectStore.shiftClip / setClipAnchors", () => {
  beforeEach(reset);

  it("shifts both anchors and clamps to the word list", () => {
    state().shiftClip("clip-fact-1883", 3);
    const clip = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(clip?.from.word).toBe(9);
    expect(clip?.to.word).toBe(12);
  });

  it("ignores zero shifts", () => {
    const before = state().project;
    state().shiftClip("clip-fact-1883", 0);
    expect(state().project).toBe(before);
  });

  it("writes explicit anchors through setClipAnchors", () => {
    state().setClipAnchors(
      "clip-fact-1883",
      { word: 1, edge: "start", offset: -0.2 },
      { word: 4, edge: "end" },
    );
    const clip = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(clip?.from).toEqual({ word: 1, edge: "start", offset: -0.2 });
    expect(clip?.to).toEqual({ word: 4, edge: "end" });
  });
});

describe("projectStore undo/redo", () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
    return () => vi.useRealTimers();
  });

  it("undo/redo setClipParam and clears redo on a new mutation", () => {
    state().setClipParam("clip-fact-1883", "title", "A");
    state().setClipParam("clip-captions", "body", "B");
    expect(state().canUndo).toBe(true);

    state().undo();
    const captions = state().project.overlays.find((c) => c.id === "clip-captions");
    expect(captions?.params.body).toBeUndefined();
    expect(state().canRedo).toBe(true);

    state().undo();
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("1883");
    expect(state().canUndo).toBe(false);

    state().redo();
    state().redo();
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("A");

    // new mutation clears redo
    state().undo();
    state().setClipParam("clip-fact-1883", "title", "C");
    expect(state().canRedo).toBe(false);
  });

  it("undo removes a newly added clip and redo restores it", () => {
    const before = state().project;
    const id = state().addClip(overlayTemplate, 6)!;
    expect(state().project.overlays.some((c) => c.id === id)).toBe(true);
    state().undo();
    expect(state().project.overlays.some((c) => c.id === id)).toBe(false);
    expect(state().project).toEqual(before);
    state().redo();
    expect(state().project.overlays.some((c) => c.id === id)).toBe(true);
  });

  it("clears selection when the selected clip disappears after undo", () => {
    const id = state().addClip(overlayTemplate, 6)!;
    expect(state().selectedClipId).toBe(id);
    state().undo();
    expect(state().selectedClipId).toBeNull();
  });

  it("coalesces rapid setClipParam edits on the same key into one undo step", () => {
    state().setClipParam("clip-fact-1883", "title", "A");
    vi.advanceTimersByTime(100);
    state().setClipParam("clip-fact-1883", "title", "AB");
    vi.advanceTimersByTime(100);
    state().setClipParam("clip-fact-1883", "title", "ABC");
    state().undo();
    // one step: back to the untouched original
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("1883");
    expect(state().canUndo).toBe(false);
  });

  it("does not coalesce edits outside the 500 ms window", () => {
    state().setClipParam("clip-fact-1883", "title", "A");
    vi.advanceTimersByTime(501);
    state().setClipParam("clip-fact-1883", "title", "AB");
    state().undo();
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("A");
    expect(state().canUndo).toBe(true);
  });

  it("coalesces rapid shiftClip on the same clip into one step", () => {
    state().shiftClip("clip-fact-1883", 1);
    vi.advanceTimersByTime(100);
    state().shiftClip("clip-fact-1883", 1);
    state().undo();
    const clip = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(clip?.from.word).toBe(6);
  });

  it("coalesces rapid setClipAnchors on the same clip into one step", () => {
    state().setClipAnchors("clip-fact-1883", { word: 6, edge: "start" }, { word: 9, edge: "end" });
    vi.advanceTimersByTime(100);
    state().setClipAnchors("clip-fact-1883", { word: 7, edge: "start" }, { word: 9, edge: "end" });
    state().undo();
    const clip = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(clip?.from.word).toBe(6);
    expect(clip?.from.edge).toBe("start");
  });

  it("selectClip is not an undo step", () => {
    state().selectClip("clip-captions");
    expect(state().canUndo).toBe(false);
  });

  it("enforces the 100-step limit", () => {
    for (let i = 0; i < 120; i++) {
      vi.advanceTimersByTime(1000);
      state().setClipParam("clip-fact-1883", "title", `v${i}`);
    }
    let undos = 0;
    while (state().canUndo) {
      state().undo();
      undos++;
    }
    expect(undos).toBe(100);
  });

  it("resetHistory clears past, future and flags", () => {
    state().setClipParam("clip-fact-1883", "title", "A");
    state().undo();
    expect(state().canRedo).toBe(true);
    state().resetHistory();
    expect(state().canUndo).toBe(false);
    expect(state().canRedo).toBe(false);
    state().redo(); // no-op
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("1883");
  });
});

describe("projectStore.setWords", () => {
  beforeEach(reset);

  const importedWords: Word[] = [
    { text: "Satu", start: 0, end: 0.5 },
    { text: "Dua", start: 0.5, end: 1.0 },
    { text: "Tiga", start: 1.0, end: 1.6 },
  ];

  it("replaces words and marks the project dirty", () => {
    expect(state().dirty).toBe(false);
    state().setWords(importedWords);
    expect(state().project.words).toEqual(importedWords);
    expect(state().dirty).toBe(true);
  });

  it("is a single undo step: undo restores the previous words snapshot", () => {
    const before = state().project;
    state().setWords(importedWords);
    expect(state().canUndo).toBe(true);
    state().undo();
    expect(state().project).toBe(before);
    expect(state().canUndo).toBe(false);
    expect(state().dirty).toBe(false);
    state().redo();
    expect(state().project.words).toEqual(importedWords);
  });

  it("clamps out-of-range clip anchors into the new word range, preserving edges and offsets", () => {
    // sample project has 13 words; clip-captions anchors 0..12, clip-fact-1883 6..10 (offset -0.2)
    state().setWords([{ text: "Halo", start: 0, end: 1 }]);
    const captions = state().project.overlays.find((c) => c.id === "clip-captions");
    const fact = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(captions?.from).toEqual({ word: 0, edge: "start" });
    expect(captions?.to).toEqual({ word: 0, edge: "end" });
    expect(fact?.from).toEqual({ word: 0, edge: "start", offset: -0.2 });
    expect(fact?.to).toEqual({ word: 0, edge: "end" });
    // redo restores the committed (clamped) new state again, not the old snapshot
    state().redo();
    const restored = state().project.overlays.find((c) => c.id === "clip-fact-1883");
    expect(restored?.from).toEqual({ word: 0, edge: "start", offset: -0.2 });
    expect(restored?.to).toEqual({ word: 0, edge: "end" });
  });
});

describe("projectStore dirty tracking", () => {
  beforeEach(reset);

  it("is clean initially and becomes dirty after a mutation", () => {
    expect(state().dirty).toBe(false);
    state().setClipParam("clip-fact-1883", "title", "Changed");
    expect(state().dirty).toBe(true);
  });

  it("clears dirty when marked as saved", () => {
    state().setClipParam("clip-fact-1883", "title", "Changed");
    state().markSaved();
    expect(state().dirty).toBe(false);
    expect(state().project.overlays.find((c) => c.id === "clip-fact-1883")?.params.title).toBe("Changed");
  });

  it("undo back to the saved snapshot clears dirty", () => {
    state().setClipParam("clip-fact-1883", "title", "Changed");
    expect(state().dirty).toBe(true);
    state().undo();
    expect(state().dirty).toBe(false);
    state().redo();
    expect(state().dirty).toBe(true);
  });

  it("setProject starts clean with a fresh saved snapshot", () => {
    state().setClipParam("clip-fact-1883", "title", "Changed");
    const fresh = createSampleProject();
    fresh.meta.name = "Imported";
    state().setProject(fresh);
    expect(state().dirty).toBe(false);
    expect(state().project.meta.name).toBe("Imported");
    expect(state().canUndo).toBe(false);
  });

  it("mutations after markSaved make it dirty again", () => {
    state().markSaved();
    state().deleteClip("clip-captions");
    expect(state().dirty).toBe(true);
  });
});
