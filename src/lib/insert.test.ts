import { describe, expect, it } from "vitest";
import { insertionAnchors, pickOverlayLane, shiftAnchor, uniqueClipId, wordIndexAtTime } from "./insert";
import type { Clip, Word } from "../types/project";
import { createSampleProject } from "./sampleProject";

const words: Word[] = [
  { text: "a", start: 0, end: 0.5 },
  { text: "b", start: 0.5, end: 1 },
  { text: "c", start: 1.5, end: 2.5 },
  { text: "d", start: 3, end: 4 },
];

const clip = (id: string, lane: number, from: number, to: number, edgeFrom = "start", edgeTo = "end"): Clip => ({
  id,
  template: "t",
  params: {},
  from: { word: from, edge: edgeFrom as "start" | "end" },
  to: { word: to, edge: edgeTo as "start" | "end" },
  lane,
});

describe("wordIndexAtTime", () => {
  it("returns the covering word", () => {
    expect(wordIndexAtTime(words, 0.7)).toBe(1);
  });

  it("returns the next word when time falls in a gap", () => {
    expect(wordIndexAtTime(words, 1.2)).toBe(2);
  });

  it("clamps to the last word past the end", () => {
    expect(wordIndexAtTime(words, 99)).toBe(3);
  });

  it("returns 0 for an empty word list", () => {
    expect(wordIndexAtTime([], 1)).toBe(0);
  });
});

describe("insertionAnchors", () => {
  it("spans only the words whose end fits inside the requested duration", () => {
    // window 0..2.2s covers words a (0-0.5) and b (0.5-1); word c ends at 2.5 > 2.2
    const { from, to } = insertionAnchors(words, 0, 2.2);
    expect(from).toEqual({ word: 0, edge: "start" });
    expect(to).toEqual({ word: 1, edge: "end" });
  });

  it("never spans less than the start word", () => {
    const { from, to } = insertionAnchors(words, 3, 0.1);
    expect(from).toEqual({ word: 3, edge: "start" });
    expect(to).toEqual({ word: 3, edge: "end" });
  });

  it("clamps the start word into range", () => {
    const { from } = insertionAnchors(words, 99, 1);
    expect(from.word).toBe(3);
  });

  it("handles an empty word list", () => {
    const { from, to } = insertionAnchors([], 0, 1);
    expect(from).toEqual({ word: 0, edge: "start" });
    expect(to).toEqual({ word: 0, edge: "end" });
  });
});

describe("pickOverlayLane", () => {
  it("picks lane 0 when it is free", () => {
    const lanes = pickOverlayLane([clip("x", 1, 0, 2)], 0, 2, words, 4);
    expect(lanes).toBe(0);
  });

  it("picks a free higher lane when lane 0 overlaps", () => {
    const lanes = pickOverlayLane([clip("x", 0, 0, 2)], 1, 3, words, 4);
    expect(lanes).toBe(1);
  });

  it("falls back to the max lane when everything overlaps", () => {
    const lanes = pickOverlayLane([clip("x", 0, 0, 2), clip("y", 1, 0, 2)], 0.5, 1.5, words, 4);
    expect(lanes).toBe(1);
  });
});

describe("uniqueClipId", () => {
  it("returns the base id when free", () => {
    const project = createSampleProject();
    expect(uniqueClipId(project, "fact-card")).toBe("clip-fact-card");
  });

  it("suffixes when the base id is taken", () => {
    const project = createSampleProject();
    project.overlays.push(clip("clip-fact-card", 0, 0, 1));
    expect(uniqueClipId(project, "fact-card")).toBe("clip-fact-card-2");
  });
});

describe("shiftAnchor", () => {
  it("shifts the word index and preserves edge and offset", () => {
    expect(shiftAnchor({ word: 1, edge: "start", offset: -0.2 }, 2, 10)).toEqual({ word: 3, edge: "start", offset: -0.2 });
  });

  it("clamps at zero and at the word count", () => {
    expect(shiftAnchor({ word: 0, edge: "start" }, -5, 4).word).toBe(0);
    expect(shiftAnchor({ word: 3, edge: "end" }, 5, 4).word).toBe(3);
  });

  it("is a no-op without words", () => {
    expect(shiftAnchor({ word: 0, edge: "start" }, 1, 0)).toEqual({ word: 0, edge: "start" });
  });
});
