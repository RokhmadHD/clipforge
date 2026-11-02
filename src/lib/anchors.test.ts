import { describe, expect, it } from "vitest";
import { resolveAnchor, resolveClip, wordsInWindow } from "./anchors";
import type { Word } from "../types/project";

const words: Word[] = [
  { text: "Pada", start: 0, end: 0.3 },
  { text: "hari", start: 0.3, end: 0.6 },
  { text: "ini", start: 0.6, end: 1 },
  { text: "Krakatau", start: 1.7, end: 2.4 },
];

describe("resolveAnchor", () => {
  it("resolves the start edge of a word", () => {
    expect(resolveAnchor(words, { word: 1, edge: "start" }, 99)).toBe(0.3);
  });

  it("resolves the end edge of a word", () => {
    expect(resolveAnchor(words, { word: 3, edge: "end" }, 99)).toBe(2.4);
  });

  it("applies the optional offset", () => {
    expect(resolveAnchor(words, { word: 2, edge: "start", offset: -0.2 }, 99)).toBeCloseTo(0.4, 10);
  });

  it("falls back when the word index no longer exists", () => {
    expect(resolveAnchor(words, { word: 42, edge: "start" }, 5.5)).toBe(5.5);
  });
});

describe("resolveClip", () => {
  it("resolves start, end and duration from anchors", () => {
    const clip = {
      id: "c",
      template: "t",
      params: {},
      from: { word: 0, edge: "start" as const },
      to: { word: 2, edge: "end" as const },
      lane: 0,
    };
    expect(resolveClip(words, clip, 8.5)).toEqual({ start: 0, end: 1, duration: 1 });
  });

  it("never returns a negative duration", () => {
    const clip = {
      id: "c",
      template: "t",
      params: {},
      from: { word: 3, edge: "end" as const },
      to: { word: 0, edge: "start" as const },
      lane: 0,
    };
    const resolved = resolveClip(words, clip, 8.5);
    expect(resolved.end).toBeGreaterThanOrEqual(resolved.start);
    expect(resolved.duration).toBe(0);
  });

  it("uses audioDuration as fallback when the to-anchor is missing", () => {
    const clip = {
      id: "c",
      template: "t",
      params: {},
      from: { word: 0, edge: "start" as const },
      to: { word: 99, edge: "end" as const },
      lane: 0,
    };
    expect(resolveClip(words, clip, 8.5).end).toBe(8.5);
  });
});

describe("wordsInWindow", () => {
  it("keeps words starting inside the window and makes times relative", () => {
    const result = wordsInWindow(words, 0.6, 2.4);
    expect(result.map((w) => w.text)).toEqual(["ini", "Krakatau"]);
    expect(result[0]).toEqual({ text: "ini", start: 0, end: 0.4 });
    expect(result[1].start).toBeCloseTo(1.1, 10);
    expect(result[1].end).toBeCloseTo(1.8, 10);
  });

  it("returns an empty list when nothing matches", () => {
    expect(wordsInWindow(words, 3, 4)).toEqual([]);
  });
});
