import type { ParamValue } from "./template";

/** Project file format version. Bump on breaking changes and add a migration. */
export const PROJECT_VERSION = 1;

/** One aligned word from the subtitle. Times are absolute seconds on the audio timeline. */
export interface Word {
  text: string;
  start: number;
  end: number;
}

/**
 * Timing is anchored to WORDS, not seconds: re-aligning or re-recording the audio
 * moves every clip automatically. Seconds are resolved only at preview/render time.
 * (lib/anchors.ts)
 */
export interface WordAnchor {
  /** index into Project.words */
  word: number;
  edge: "start" | "end";
  /** optional shift in seconds, e.g. -0.2 to enter slightly before the word */
  offset?: number;
}

export type AssetKind = "image" | "video" | "audio";

export interface Asset {
  id: string;
  kind: AssetKind;
  /** absolute or project-relative path */
  path: string;
  tags?: string[];
}

/** A theme is a set of CSS custom properties injected into every template (--cf-*). */
export interface Theme {
  id: string;
  name: string;
  tokens: Record<string, string>;
}

export interface Clip {
  id: string;
  /** template id = folder name in public/templates */
  template: string;
  params: Record<string, ParamValue>;
  from: WordAnchor;
  to: WordAnchor;
  /** visual row on the timeline (overlays can stack) */
  lane: number;
}

/** A variant = same storyboard, different theme / overrides. One render job per variant. */
export interface Variant {
  id: string;
  name: string;
  themeId: string;
  /** per-clip parameter overrides: clipId -> params */
  overrides: Record<string, Record<string, ParamValue>>;
}

export interface Project {
  version: typeof PROJECT_VERSION;
  meta: { name: string; width: number; height: number; fps: number };
  audio: { path: string; duration: number } | null;
  words: Word[];
  assets: Asset[];
  themes: Theme[];
  activeThemeId: string;
  /** full-screen base track (sequential). Empty until scene templates exist (M3). */
  scenes: Clip[];
  /** transparent layers on top: captions, fact cards, CTA... */
  overlays: Clip[];
  variants: Variant[];
}
