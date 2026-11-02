import type { Clip, Word, WordAnchor } from "../types/project";

/** Resolve a word anchor to absolute seconds. Falls back if the word no longer exists. */
export function resolveAnchor(words: Word[], a: WordAnchor, fallback: number): number {
  const w = words[a.word];
  if (!w) return fallback;
  return (a.edge === "end" ? w.end : w.start) + (a.offset ?? 0);
}

export interface ResolvedClip {
  start: number;
  end: number;
  duration: number;
}

export function resolveClip(words: Word[], clip: Clip, audioDuration: number): ResolvedClip {
  const start = Math.max(0, resolveAnchor(words, clip.from, 0));
  const end = Math.max(start, resolveAnchor(words, clip.to, audioDuration));
  return { start, end, duration: end - start };
}

/** Words that fall inside [start, end], with times made RELATIVE to `start` (for the `w` param). */
export function wordsInWindow(words: Word[], start: number, end: number): Word[] {
  return words
    .filter((w) => w.start >= start - 1e-6 && w.start < end)
    .map((w) => ({ text: w.text, start: w.start - start, end: w.end - start }));
}
