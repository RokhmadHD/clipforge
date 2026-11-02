import type { Word } from "../types/project";

/**
 * Subtitle import (T4): pure parsers for SRT, WebVTT and JSON word lists.
 * Every parser returns Word[] ({text, start, end} in absolute seconds) sorted
 * by start. parseSubtitleFile dispatches on the file extension and returns the
 * same ok/error result shape as parseProjectFile in src/lib/projectFile.ts.
 */

export type ParseResult =
  | { ok: true; words: Word[] }
  | { ok: false; error: string };

/** "HH:MM:SS[.,]mmm" or "MM:SS[.,]mmm" (hours optional, VTT style) -> seconds. */
const TIMESTAMP_RE = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/;
/** Timestamp line: start --> end (trailing VTT cue settings are ignored). */
const CUE_LINE_RE = /^(.+?)\s*-->\s*(\S+)/;
/** VTT blocks that carry no cues. */
const VTT_IGNORED_RE = /^(WEBVTT|NOTE|STYLE|REGION)\b/;

function parseTimestamp(raw: string): number | null {
  const match = TIMESTAMP_RE.exec(raw.trim());
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = match[4] ? parseInt(match[4].padEnd(3, "0"), 10) : 0;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/** Split text into blocks of trimmed lines; blank lines are separators. */
function splitBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/**
 * Join all whitespace-separated tokens of a cue's text lines into sequential
 * words, distributing the cue duration evenly (each word gets duration / wordCount).
 */
function wordsFromCueText(lines: string[], start: number, end: number): Word[] {
  const tokens = lines.flatMap((line) => line.split(/\s+/)).filter((token) => token !== "");
  if (tokens.length === 0) return [];
  const slice = (end - start) / tokens.length;
  return tokens.map((text, i) => ({ text, start: start + i * slice, end: start + (i + 1) * slice }));
}

/** Cues: find the "-->" line inside each block; everything before it (index / cue id) is ignored. */
function wordsFromCueBlocks(blocks: string[][]): Word[] {
  const words: Word[] = [];
  for (const block of blocks) {
    const cueLine = block.findIndex((line) => line.includes("-->"));
    if (cueLine === -1) continue;
    const match = CUE_LINE_RE.exec(block[cueLine]);
    if (!match) continue;
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    if (start === null || end === null) continue;
    words.push(...wordsFromCueText(block.slice(cueLine + 1), start, end));
  }
  return words;
}

function sortWords(words: Word[]): Word[] {
  return [...words].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** SRT: index lines optional, "HH:MM:SS,mmm --> HH:MM:SS,mmm" ("." millis also accepted). */
export function parseSrt(text: string): Word[] {
  return sortWords(wordsFromCueBlocks(splitBlocks(text)));
}

/** WebVTT: WEBVTT header, NOTE/STYLE/REGION blocks ignored; "MM:SS.mmm" or "HH:MM:SS.mmm". */
export function parseVtt(text: string): Word[] {
  const blocks = splitBlocks(text).filter((block) => !VTT_IGNORED_RE.test(block[0]));
  return sortWords(wordsFromCueBlocks(blocks));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function checkedWord(text: unknown, start: unknown, end: unknown, label: string): Word {
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`${label}: text harus string non-kosong.`);
  }
  if (
    typeof start !== "number" ||
    !Number.isFinite(start) ||
    typeof end !== "number" ||
    !Number.isFinite(end)
  ) {
    throw new Error(`${label}: start/end harus angka finite.`);
  }
  if (start < 0 || end < 0) throw new Error(`${label}: waktu tidak boleh negatif.`);
  if (start >= end) throw new Error(`${label}: start (${start}) harus lebih kecil dari end (${end}).`);
  return { text: text.trim(), start, end };
}

function wordFromEntry(entry: unknown, index: number): Word {
  const label = `Kata #${index + 1}`;
  if (Array.isArray(entry)) {
    if (entry.length < 3) throw new Error(`${label}: tuple harus [text, start, end].`);
    return checkedWord(entry[0], entry[1], entry[2], label);
  }
  if (isRecord(entry)) return checkedWord(entry.text, entry.start, entry.end, label);
  throw new Error(`${label}: format tidak dikenal (harapkan {text, start, end} atau [text, start, end]).`);
}

/**
 * JSON: accepts {words:[{text,start,end}]}, an array of {text,start,end} objects,
 * or an array of [text,start,end] tuples. Throws Error with a clear message on
 * invalid input (bad JSON, wrong shape, non-numeric times, start >= end, negative).
 */
export function parseSubtitleJson(text: string): Word[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Bukan file JSON yang valid.");
  }
  let entries: unknown[];
  if (Array.isArray(data)) {
    entries = data;
  } else if (isRecord(data) && Array.isArray(data.words)) {
    entries = data.words;
  } else {
    throw new Error("Struktur JSON tidak dikenal: harapkan {words:[...]} atau array kata.");
  }
  return sortWords(entries.map(wordFromEntry));
}

const SUPPORTED_EXTENSIONS = ".srt, .vtt, .json";

/**
 * Dispatch on the filename extension (.srt / .vtt / .json; .txt is tried as
 * SRT first, then VTT, because many subtitle exports use a .txt name).
 * Never throws: every failure becomes {ok:false, error}.
 */
export function parseSubtitleFile(filename: string, text: string): ParseResult {
  const dot = filename.lastIndexOf(".");
  const ext = dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
  try {
    let words: Word[];
    if (ext === "srt") {
      words = parseSrt(text);
    } else if (ext === "vtt") {
      words = parseVtt(text);
    } else if (ext === "json") {
      words = parseSubtitleJson(text);
    } else if (ext === "txt") {
      const asSrt = parseSrt(text);
      words = asSrt.length > 0 ? asSrt : parseVtt(text);
    } else if (ext === "") {
      return { ok: false, error: `File tidak memiliki ekstensi (didukung: ${SUPPORTED_EXTENSIONS}).` };
    } else {
      return { ok: false, error: `Ekstensi ".${ext}" tidak didukung (didukung: ${SUPPORTED_EXTENSIONS}).` };
    }
    if (words.length === 0) {
      return { ok: false, error: "Tidak ada cue subtitle yang bisa dibaca dari file ini." };
    }
    return { ok: true, words };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal membaca file subtitle." };
  }
}
