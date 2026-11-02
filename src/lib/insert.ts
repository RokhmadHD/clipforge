import type { Clip, Project, Word, WordAnchor } from "../types/project";

/**
 * Insertion helpers shared by the Material Library (template -> timeline) and
 * the timeline drag/resize interactions. Pure functions so they are testable
 * and the store stays a thin mutation layer.
 */

/** Word index whose window covers `time`, else the next word after it, else the last word. */
export function wordIndexAtTime(words: Word[], time: number): number {
  if (words.length === 0) return 0;
  const covering = words.findIndex((w) => time >= w.start && time < w.end);
  if (covering >= 0) return covering;
  const next = words.findIndex((w) => w.start > time);
  return next >= 0 ? next : words.length - 1;
}

/**
 * Anchors for a clip of roughly `duration` seconds starting at `startWord`:
 * from = start edge of startWord, to = end edge of the last word whose end
 * fits inside the requested duration (never earlier than the start word).
 */
export function insertionAnchors(words: Word[], startWord: number, duration: number): { from: WordAnchor; to: WordAnchor } {
  if (words.length === 0) {
    return { from: { word: 0, edge: "start" }, to: { word: 0, edge: "end" } };
  }
  const fromIndex = Math.min(Math.max(0, startWord), words.length - 1);
  const from = words[fromIndex];
  const limit = from.start + Math.max(duration, 0.1);
  let toIndex = fromIndex;
  for (let i = fromIndex; i < words.length; i++) {
    if (words[i].end <= limit) toIndex = i;
    else break;
  }
  return { from: { word: fromIndex, edge: "start" }, to: { word: toIndex, edge: "end" } };
}

/** Lowest overlay lane (0..maxLane) without a time overlap at [start, end); falls back to maxLane. */
export function pickOverlayLane(clips: Clip[], start: number, end: number, words: Word[], audioDuration: number, maxLane = 1): number {
  const resolved = clips.map((clip) => {
    const from = words[clip.from.word];
    const to = words[clip.to.word];
    const clipStart = clip.from.edge === "start" ? from?.start ?? 0 : from?.end ?? 0;
    const clipEnd = clip.to.edge === "end" ? to?.end ?? audioDuration : to?.start ?? audioDuration;
    return { lane: clip.lane, start: clipStart, end: Math.max(clipStart, clipEnd) };
  });
  for (let lane = 0; lane <= maxLane; lane++) {
    const occupied = resolved.some((r) => r.lane === lane && start < r.end && end > r.start);
    if (!occupied) return lane;
  }
  return maxLane;
}

/** Clip id that does not collide with existing ones: base, base-2, base-3, … */
export function uniqueClipId(project: Project, templateId: string): string {
  const base = `clip-${templateId}`;
  const taken = new Set([...project.scenes, ...project.overlays].map((c) => c.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Anchor update for drag/resize: shift an anchor by a word-index delta,
 * clamped to the word list. Offsets and edges are preserved.
 */
export function shiftAnchor(anchor: WordAnchor, delta: number, wordCount: number): WordAnchor {
  if (wordCount === 0) return anchor;
  const word = Math.min(Math.max(0, anchor.word + delta), wordCount - 1);
  return { ...anchor, word };
}
