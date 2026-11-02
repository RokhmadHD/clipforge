/**
 * Injectable storage layer for persisted editor panel layout.
 * Kept free of zustand/DOM assumptions so it can be tested in a plain
 * node environment (no jsdom) with an in-memory implementation.
 */

export interface LayoutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const LAYOUT_STORAGE_KEY = "clipforge.ui.layout.v1";

export interface LayoutValues {
  libraryWidth: number;
  inspectorWidth: number;
  timelineHeight: number;
}

const LAYOUT_KEYS: readonly (keyof LayoutValues)[] = [
  "libraryWidth",
  "inspectorWidth",
  "timelineHeight",
];

/**
 * Read and parse a persisted layout. Returns only the keys that parse to
 * finite numbers; anything missing, corrupt or non-numeric is omitted so the
 * caller can fall back to defaults. Never throws, even if storage itself
 * fails (private mode, disabled storage, ...).
 */
export const loadLayout = (storage: LayoutStorage, key: string): Partial<LayoutValues> => {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return {};
  }
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const record = parsed as Record<string, unknown>;
  const result: Partial<LayoutValues> = {};
  for (const layoutKey of LAYOUT_KEYS) {
    const value = record[layoutKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[layoutKey] = value;
    }
  }
  return result;
};

/**
 * Persist a layout. Failures (quota exceeded, unavailable storage) are
 * swallowed: losing a layout preference must never break the editor.
 */
export const saveLayout = (storage: LayoutStorage, key: string, layout: LayoutValues): void => {
  try {
    storage.setItem(key, JSON.stringify(layout));
  } catch {
    // Storage unavailable or full — keep the in-memory state authoritative.
  }
};

/** localStorage-backed implementation for the real app. */
export const createLocalStorage = (): LayoutStorage => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  // Non-browser environment (tests, SSR): fall back to in-memory so the
  // default store keeps working without jsdom.
  return createInMemoryLayoutStorage();
};

/** Plain in-memory implementation for tests and fallbacks. */
export const createInMemoryLayoutStorage = (): LayoutStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
};
