import type { Project } from "../types/project";

/**
 * Pure undo/redo history over immutable Project snapshots.
 * Snapshots are stored by reference (project state is updated immutably,
 * so no deep clone is needed). Time is injected for testability.
 */

export const HISTORY_LIMIT = 100;
export const COALESCE_WINDOW_MS = 500;

export interface HistoryState {
  /** Snapshots of the project before each undoable change (past[0] is the oldest). */
  past: Project[];
  /** Current project snapshot. */
  present: Project;
  /** Snapshots redo would restore (redoStack[0] is the most recent). */
  future: Project[];
  /** Coalescing key of the last pushed change (e.g. "param:<clipId>:<key>"). */
  lastKey: string | null;
  /** Timestamp (ms) of the last pushed change, in injected time. */
  lastAt: number;
}

export const createHistory = (present: Project, now = 0): HistoryState => ({
  past: [],
  present,
  future: [],
  lastKey: null,
  lastAt: now,
});

/**
 * Record a new project snapshot. Consecutive changes with the same coalescing
 * `key` within COALESCE_WINDOW_MS replace the previous step instead of adding
 * a new one. Any new step clears the redo stack.
 */
export const pushHistory = (
  history: HistoryState,
  next: Project,
  key: string | null,
  now: number,
): HistoryState => {
  const coalesce =
    key !== null && history.lastKey === key && now - history.lastAt <= COALESCE_WINDOW_MS;
  const past = coalesce ? history.past : [...history.past, history.present];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, present: next, future: [], lastKey: key, lastAt: now };
};

export const undoHistory = (history: HistoryState): HistoryState => {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastKey: null,
    lastAt: history.lastAt,
  };
};

export const redoHistory = (history: HistoryState): HistoryState => {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
    lastKey: null,
    lastAt: history.lastAt,
  };
};

export const canUndoHistory = (history: HistoryState): boolean => history.past.length > 0;
export const canRedoHistory = (history: HistoryState): boolean => history.future.length > 0;
