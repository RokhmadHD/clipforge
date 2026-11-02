import { describe, expect, it } from "vitest";
import {
  COALESCE_WINDOW_MS,
  HISTORY_LIMIT,
  canRedoHistory,
  canUndoHistory,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "./history";
import type { Project } from "../types/project";

const p = (name: string): Project => ({ meta: { name } } as unknown as Project);

describe("history basics", () => {
  it("push, undo, redo round trip", () => {
    let h = createHistory(p("v0"));
    h = pushHistory(h, p("v1"), null, 0);
    expect(h.present.meta.name).toBe("v1");
    expect(canUndoHistory(h)).toBe(true);

    h = undoHistory(h);
    expect(h.present.meta.name).toBe("v0");
    expect(canUndoHistory(h)).toBe(false);
    expect(canRedoHistory(h)).toBe(true);

    h = redoHistory(h);
    expect(h.present.meta.name).toBe("v1");
    expect(canRedoHistory(h)).toBe(false);
  });

  it("a new push clears the redo stack", () => {
    let h = createHistory(p("v0"));
    h = pushHistory(h, p("v1"), null, 0);
    h = undoHistory(h);
    expect(canRedoHistory(h)).toBe(true);
    h = pushHistory(h, p("v2"), null, 10);
    expect(canRedoHistory(h)).toBe(false);
    expect(h.present.meta.name).toBe("v2");
  });

  it("undo/redo on empty history is a no-op", () => {
    const h = createHistory(p("v0"), 0);
    expect(undoHistory(h)).toBe(h);
    expect(redoHistory(h)).toBe(h);
  });
});

describe("history limit", () => {
  it("keeps at most HISTORY_LIMIT steps, dropping the oldest", () => {
    let h = createHistory(p("base"));
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      h = pushHistory(h, p(`v${i}`), null, i * 10_000);
    }
    expect(h.past.length).toBe(HISTORY_LIMIT);
    // oldest surviving past snapshot is base + HISTORY_LIMIT - 1 steps behind
    expect(h.past[0].meta.name).toBe("base");
    let undos = 0;
    while (canUndoHistory(h)) {
      h = undoHistory(h);
      undos++;
    }
    expect(undos).toBe(HISTORY_LIMIT);
    expect(h.present.meta.name).toBe("base");
  });
});

describe("coalescing", () => {
  it("merges consecutive same-key pushes within the window", () => {
    let h = createHistory(p("v0"), 0);
    h = pushHistory(h, p("v1"), "param:a:title", 1000);
    h = pushHistory(h, p("v2"), "param:a:title", 1200);
    expect(h.past.length).toBe(1);
    h = undoHistory(h);
    expect(h.present.meta.name).toBe("v0");
  });

  it("does not merge when the window has elapsed", () => {
    let h = createHistory(p("v0"), 0);
    h = pushHistory(h, p("v1"), "param:a:title", 1000);
    h = pushHistory(h, p("v2"), "param:a:title", 1000 + COALESCE_WINDOW_MS + 1);
    expect(h.past.length).toBe(2);
    h = undoHistory(h);
    expect(h.present.meta.name).toBe("v1");
  });

  it("does not merge different keys", () => {
    let h = createHistory(p("v0"), 0);
    h = pushHistory(h, p("v1"), "param:a:title", 1000);
    h = pushHistory(h, p("v2"), "param:a:body", 1100);
    expect(h.past.length).toBe(2);
  });

  it("never merges null-key pushes", () => {
    let h = createHistory(p("v0"), 0);
    h = pushHistory(h, p("v1"), null, 1000);
    h = pushHistory(h, p("v2"), null, 1100);
    expect(h.past.length).toBe(2);
  });
});
