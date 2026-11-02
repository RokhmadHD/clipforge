import { create } from "zustand";
import type { Clip, Project, WordAnchor } from "../types/project";
import type { ParamValue, TemplateManifest } from "../types/template";
import { createSampleProject } from "../lib/sampleProject";
import { insertionAnchors, pickOverlayLane, shiftAnchor, uniqueClipId } from "../lib/insert";

/**
 * The project JSON is the single source of truth: UI, AI and renderer all read/write it.
 * TODO(M2): undo/redo (history stack of immutable snapshots), autosave via Tauri fs.
 */
interface ProjectState {
  project: Project;
  selectedClipId: string | null;
  selectClip: (id: string | null) => void;
  setClipParam: (clipId: string, key: string, value: ParamValue) => void;
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

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createSampleProject(),
  selectedClipId: "clip-fact-1883",
  selectClip: (selectedClipId) => set({ selectedClipId }),
  setClipParam: (clipId, key, value) =>
    set((s) => {
      const apply = (c: Clip): Clip => ({ ...c, params: { ...c.params, [key]: value } });
      return {
        project: {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        },
      };
    }),
  addClip: (template, startWord) => {
    const { project } = get();
    const words = project.words;
    if (words.length === 0) return null;
    const audioDuration = project.audio?.duration ?? 0;
    const { from, to } = insertionAnchors(words, startWord, template.defaultDuration);
    const id = uniqueClipId(project, template.id);
    const clip: Clip = { id, template: template.id, params: {}, from, to, lane: 0 };

    if (template.kind === "scene") {
      // Scenes form a sequential base track; append after the last scene.
      const last = project.scenes[project.scenes.length - 1];
      if (last) {
        clip.from = { word: last.to.word, edge: last.to.edge };
        const shifted = insertionAnchors(words, Math.min(last.to.word + 1, words.length - 1), template.defaultDuration);
        clip.to = shifted.to;
      }
      set((s) => ({ project: { ...s.project, scenes: [...s.project.scenes, clip] }, selectedClipId: id }));
    } else {
      const start = words[from.word].start;
      const end = words[to.word].end;
      clip.lane = pickOverlayLane(project.overlays, start, end, words, audioDuration);
      set((s) => ({ project: { ...s.project, overlays: [...s.project.overlays, clip] }, selectedClipId: id }));
    }
    return id;
  },
  deleteClip: (clipId) =>
    set((s) => ({
      project: {
        ...s.project,
        scenes: s.project.scenes.filter((c) => c.id !== clipId),
        overlays: s.project.overlays.filter((c) => c.id !== clipId),
      },
      selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
    })),
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
    set((s) => ({
      project: isOverlay
        ? { ...s.project, overlays: [...s.project.overlays, copy] }
        : { ...s.project, scenes: [...s.project.scenes, copy] },
      selectedClipId: id,
    }));
  },
  setClipAnchors: (clipId, from, to) =>
    set((s) => {
      const apply = (c: Clip): Clip => (c.id === clipId ? { ...c, from, to } : c);
      return {
        project: {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        },
      };
    }),
  shiftClip: (clipId, deltaWords) => {
    if (deltaWords === 0) return;
    const wordCount = get().project.words.length;
    set((s) => {
      const apply = (c: Clip): Clip =>
        c.id === clipId
          ? { ...c, from: shiftAnchor(c.from, deltaWords, wordCount), to: shiftAnchor(c.to, deltaWords, wordCount) }
          : c;
      return {
        project: {
          ...s.project,
          scenes: patchClips(s.project.scenes, clipId, apply),
          overlays: patchClips(s.project.overlays, clipId, apply),
        },
      };
    });
  },
}));
