import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "./projectStore";
import { createSampleProject } from "../lib/sampleProject";
import type { TemplateManifest } from "../types/template";

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
  useProjectStore.setState({ project: createSampleProject(), selectedClipId: "clip-fact-1883" });
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
