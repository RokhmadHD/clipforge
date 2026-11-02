import { describe, expect, it } from "vitest";
import {
  createInMemoryLayoutStorage,
  LAYOUT_STORAGE_KEY,
  loadLayout,
  saveLayout,
  type LayoutStorage,
} from "./layoutStorage";

describe("layoutStorage", () => {
  describe("createInMemoryLayoutStorage", () => {
    it("round-trips values and returns null for missing keys", () => {
      const storage = createInMemoryLayoutStorage();
      expect(storage.getItem("missing")).toBeNull();
      storage.setItem(LAYOUT_STORAGE_KEY, '{"libraryWidth":300}');
      expect(storage.getItem(LAYOUT_STORAGE_KEY)).toBe('{"libraryWidth":300}');
    });
  });

  describe("loadLayout", () => {
    it("returns {} when the key is absent", () => {
      expect(loadLayout(createInMemoryLayoutStorage(), LAYOUT_STORAGE_KEY)).toEqual({});
    });

    it("parses only known numeric fields", () => {
      const storage = createInMemoryLayoutStorage();
      storage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify({
          libraryWidth: 300,
          inspectorWidth: "not a number",
          timelineHeight: 200,
          unknown: 42,
        }),
      );
      expect(loadLayout(storage, LAYOUT_STORAGE_KEY)).toEqual({
        libraryWidth: 300,
        timelineHeight: 200,
      });
    });

    it("returns {} on corrupt JSON", () => {
      const storage = createInMemoryLayoutStorage();
      storage.setItem(LAYOUT_STORAGE_KEY, "{not valid json");
      expect(loadLayout(storage, LAYOUT_STORAGE_KEY)).toEqual({});
    });

    it("returns {} for non-object payloads", () => {
      const storage = createInMemoryLayoutStorage();
      storage.setItem(LAYOUT_STORAGE_KEY, "[1,2,3]");
      expect(loadLayout(storage, LAYOUT_STORAGE_KEY)).toEqual({});
    });

    it("returns {} when getItem throws", () => {
      const storage: LayoutStorage = {
        getItem: () => {
          throw new Error("unavailable");
        },
        setItem: () => {},
      };
      expect(loadLayout(storage, LAYOUT_STORAGE_KEY)).toEqual({});
    });
  });

  describe("saveLayout", () => {
    it("stores the layout as JSON", () => {
      const storage = createInMemoryLayoutStorage();
      saveLayout(storage, LAYOUT_STORAGE_KEY, {
        libraryWidth: 300,
        inspectorWidth: 320,
        timelineHeight: 260,
      });
      expect(storage.getItem(LAYOUT_STORAGE_KEY)).toBe(
        JSON.stringify({ libraryWidth: 300, inspectorWidth: 320, timelineHeight: 260 }),
      );
    });

    it("swallows setItem failures without throwing", () => {
      const storage: LayoutStorage = {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota exceeded");
        },
      };
      expect(() =>
        saveLayout(storage, LAYOUT_STORAGE_KEY, {
          libraryWidth: 300,
          inspectorWidth: 320,
          timelineHeight: 260,
        }),
      ).not.toThrow();
    });
  });
});
