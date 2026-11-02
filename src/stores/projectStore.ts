import { create } from "zustand";
import type { Clip, Project, Word, WordAnchor } from "../types/project";
import type { ParamValue, TemplateManifest } from "../types/template";
import { createSampleProject } from "../lib/sampleProject";
import { insertionAnchors, pickOverlayLane, shiftAnchor, uniqueClipId } from "../lib/insert";
import {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from "../lib/history";

/**
 * The project JSON is the single source of truth: UI, AI and renderer all read/write it.
 * Undo/redo keeps immutable Project snapshots (by reference) in src/lib/history.ts.
 * TODO(M2): autosave via Tauri fs.
 */
interface ProjectState {
  project: Project;
  selectedClipId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Reference snapshot of the last saved/loaded project; dirty = project !== lastSaved. */
  lastSaved: Project;
  dirty: boolean;
  history: HistoryState;
  selectClip: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
  /** Clear the dirty flag after the current project has been written to disk. */
  markSaved: () => void;
  setClipParam: (clipId: string, key: string, value: ParamValue) => void;
  setProject: (project: Project) => void;
  /**
   * Replace all subtitle words (subtitle import). One undo step (no coalescing).
   * Every clip's from.word/to.word is clamped into the new word range 0..len-1
   * in the SAME committed project (edges/offsets preserved), so anchors never dangle.
   */
  setWords: (words: Word[]) => void;
  /**
   * Set or clear the project audio (audio import). One undo step (no
   * coalescing) via the standard commit()/lastSaved dirty pattern, like
   * setWords. Pass null to clear; undo restores the previous audio.
   */
  setAudio: (audio: { path: string; duration: number } | null) => void;
  /** Insert a clip from a template manifest; startWord is a Project.words index. Returns the new id. */
  addClip: (template: TemplateManifest, startWord: number) => string | null;
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  /** Drag/resize writes anchors back through this action; no second time representation. */
  setClipAnchors: (clipId: string, from: WordAnchor, to: WordAnchor) => void;
  /** Shift a clip's word anchors by a relative word-index delta (timeline drag). */
  shiftClip: (clipId: string, deltaWords: number) => void;
}

const patchClips = (clips: Clip[], id: string, fn: (c: Clip) => Clip): Clip[] =>
  clips.map((c) => (c.id === id ? fn(c) : c));

const hasClip = (project: Project, id: string | null): boolean =>
  id !== null && (project.scenes.some((c) => c.id === id) || project.overlays.some((c) => c.id === id));

// One shared initial instance: lastSaved, history and project must reference the
// SAME object or the by-reference dirty comparison breaks after undo.
const initialProject = createSampleProject();

export const useProjectStore = create<ProjectState>((set, get) => {
  /**
   * Apply a project mutation as one undo step.
   * `key` is the coalescing key (null = never coalesce).
   */
  const commit = (
    s: { project: Project; selectedClipId: string | null; history: HistoryState; lastSaved: Project },
    nextProject: Project,
    key: string | null,
    patch: Partial<ProjectState> = {},
  ) => {
    const history = pushHistory(s.history, nextProject, key, Date.now());
    return {
      project: nextProject,
      history,
      canUndo: canUndoHistory(history),
      canRedo: false,
      dirty: nextProject !== s.lastSaved,
      ...patch,
    };
  };

  return {
    project: initialProject,
    selectedClipId: "clip-fact-1883",
    history: createHistory(initialProject),
    canUndo: false,
    canRedo: false,
    lastSaved: initialProject,
    dirty: false,
    selectClip: (selectedClipId) => set({ selectedClipId }),
    /** Replace the whole project (e.g. when opening a file). Starts a fresh history. */
    setProject: (project) =>
      set((s) => {
        const history = createHistory(project, Date.now());
        return {
          project,
          history,
          lastSaved: project,
          dirty: false,
          selectedClipId: hasClip(project, s.selectedClipId) ? s.selectedClipId : null,
          canUndo: false,
          canRedo: false,
        };
      }),
    markSaved: () =>
      set((s) => (s.dirty ? { lastSaved: s.project, dirty: false } : {} as Partial<ProjectState>)),
    setWords: (words) =>
      set((s) => {
        const maxWord = Math.max(words.length - 1, 0);
        const clampAnchor = (anchor: WordAnchor): WordAnchor => ({
          ...anchor,
          word: Math.min(Math.max(anchor.word, 0), maxWord),
        });
        const clampClip = (clip: Clip): Clip => ({
          ...clip,
          from: clampAnchor(clip.from),
          to: clampAnchor(clip.to),
        });
        return commit(s, {
          ...s.project,
          words,
          scenes: s.project.scenes.map(clampClip),
          overlays: s.project.overlays.map(clampClip),
        }, null);
      }),
    setAudio: (audio) =>
      set((s) => commit(s, { ...s.project, audio }, null)),
    setClipParam: (clipId, key, value) =>
      set((s) => {
        const apply = (c: Clip): Clip => ({ ...c, params: { ...c.params, [key]: value } });
        const project: Project = {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        };
        return commit(s, project, `param:${clipId}:${key}`);
      }),
    addClip: (template, startWord) => {
      const { project } = get();
      const words = project.words;
      if (words.length === 0) return null;
      const audioDuration = project.audio?.duration ?? 0;
      const { from, to } = insertionAnchors(words, startWord, template.defaultDuration);
      const id = uniqueClipId(project, template.id);
      const clip: Clip = { id, template: template.id, params: {}, from, to, lane: 0 };

      let next: Project;
      if (template.kind === "scene") {
        // Scenes form a sequential base track; append after the last scene.
        const last = project.scenes[project.scenes.length - 1];
        if (last) {
          clip.from = { word: last.to.word, edge: last.to.edge };
          const shifted = insertionAnchors(words, Math.min(last.to.word + 1, words.length - 1), template.defaultDuration);
          clip.to = shifted.to;
        }
        next = { ...project, scenes: [...project.scenes, clip] };
      } else {
        const start = words[from.word].start;
        const end = words[to.word].end;
        clip.lane = pickOverlayLane(project.overlays, start, end, words, audioDuration);
        next = { ...project, overlays: [...project.overlays, clip] };
      }
      set((s) => commit(s, next, null, { selectedClipId: id }));
      return id;
    },
    deleteClip: (clipId) =>
      set((s) =>
        commit(
          s,
          {
            ...s.project,
            scenes: s.project.scenes.filter((c) => c.id !== clipId),
            overlays: s.project.overlays.filter((c) => c.id !== clipId),
          },
          null,
          { selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId },
        ),
      ),
    duplicateClip: (clipId) => {
      const { project } = get();
      const source = [...project.scenes, ...project.overlays].find((c) => c.id === clipId);
      if (!source) return;
      const id = uniqueClipId(project, source.template);
      const copy: Clip = { ...source, id, params: { ...source.params } };
      const isOverlay = project.overlays.some((c) => c.id === clipId);
      if (isOverlay) {
        const words = project.words;
        const start = words[copy.from.word]?.start ?? 0;
        const end = words[copy.to.word]?.end ?? project.audio?.duration ?? 0;
        copy.lane = pickOverlayLane(project.overlays, start, end, words, project.audio?.duration ?? 0);
      }
      const next: Project = isOverlay
        ? { ...project, overlays: [...project.overlays, copy] }
        : { ...project, scenes: [...project.scenes, copy] };
      set((s) => commit(s, next, null, { selectedClipId: id }));
    },
    setClipAnchors: (clipId, from, to) =>
      set((s) => {
        const apply = (c: Clip): Clip => (c.id === clipId ? { ...c, from, to } : c);
        return commit(s, {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        }, `anchors:${clipId}`);
      }),
    shiftClip: (clipId, deltaWords) => {
      if (deltaWords === 0) return;
      const wordCount = get().project.words.length;
      set((s) => {
        const apply = (c: Clip): Clip =>
          c.id === clipId
            ? { ...c, from: shiftAnchor(c.from, deltaWords, wordCount), to: shiftAnchor(c.to, deltaWords, wordCount) }
            : c;
        return commit(s, {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        }, `move:${clipId}`);
      });
    },
    undo: () =>
      set((s) => {
        const history = undoHistory(s.history);
        if (history === s.history) return {} as Partial<ProjectState>;
        const selectedClipId = hasClip(history.present, s.selectedClipId) ? s.selectedClipId : null;
        return {
          project: history.present,
          history,
          selectedClipId,
          canUndo: canUndoHistory(history),
          canRedo: canRedoHistory(history),
          dirty: history.present !== s.lastSaved,
        };
      }),
    redo: () =>
      set((s) => {
        const history = redoHistory(s.history);
        if (history === s.history) return {} as Partial<ProjectState>;
        const selectedClipId = hasClip(history.present, s.selectedClipId) ? s.selectedClipId : null;
        return {
          project: history.present,
          history,
          selectedClipId,
          canUndo: canUndoHistory(history),
          canRedo: canRedoHistory(history),
          dirty: history.present !== s.lastSaved,
        };
      }),
    resetHistory: () =>
      set((s) => {
        const history = createHistory(s.project, Date.now());
        return { history, canUndo: false, canRedo: false };
      }),
  };
});
