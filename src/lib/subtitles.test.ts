import { describe, expect, it } from "vitest";
import { parseSrt, parseSubtitleFile, parseSubtitleJson, parseVtt } from "./subtitles";

describe("parseSrt", () => {
  it("parses multi-line cues with comma millis, joining cue lines into even words", () => {
    const srt = [
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "Gunung Krakatau",
      "meletus hari",
      "",
      "2",
      "00:00:04,500 --> 00:00:05,500",
      "Dua kata",
      "",
    ].join("\n");
    // cue 1: 4 tokens over 2 s -> 0.5 s each; cue 2: 2 tokens over 1 s -> 0.5 s each
    expect(parseSrt(srt)).toEqual([
      { text: "Gunung", start: 1.0, end: 1.5 },
      { text: "Krakatau", start: 1.5, end: 2.0 },
      { text: "meletus", start: 2.0, end: 2.5 },
      { text: "hari", start: 2.5, end: 3.0 },
      { text: "Dua", start: 4.5, end: 5.0 },
      { text: "kata", start: 5.0, end: 5.5 },
    ]);
  });

  it("makes index lines optional, accepts '.' millis and CRLF line endings", () => {
    const srt = "00:00:01.000 --> 00:00:02.000\r\nSatu dua\r\n\r\n00:00:03.000 --> 00:00:05.000\r\nTiga";
    expect(parseSrt(srt)).toEqual([
      { text: "Satu", start: 1.0, end: 1.5 },
      { text: "dua", start: 1.5, end: 2.0 },
      { text: "Tiga", start: 3.0, end: 5.0 },
    ]);
  });

  it("returns an empty list when there are no cues", () => {
    expect(parseSrt("hanya teks biasa tanpa timestamp")).toEqual([]);
  });
});

describe("parseVtt", () => {
  it("ignores WEBVTT header, NOTE and STYLE blocks, keeps cues with ids and settings", () => {
    const vtt = [
      "WEBVTT",
      "",
      "NOTE this is a comment",
      "spanning multiple lines",
      "",
      "STYLE",
      "::cue { color: red }",
      "",
      "intro",
      "00:01.000 --> 00:02.500 position:50%",
      "Halo dunia lagi",
      "",
    ].join("\n");
    // 3 tokens over 1.5 s -> 0.5 s each ("00:01.000" = 1 second, minutes:seconds.mmm)
    expect(parseVtt(vtt)).toEqual([
      { text: "Halo", start: 1.0, end: 1.5 },
      { text: "dunia", start: 1.5, end: 2.0 },
      { text: "lagi", start: 2.0, end: 2.5 },
    ]);
  });

  it("supports full HH:MM:SS.mmm timestamps", () => {
    const vtt = "WEBVTT\n\n00:00:01,000 --> 00:00:02,000\nSatu dua";
    expect(parseVtt(vtt)).toEqual([
      { text: "Satu", start: 1.0, end: 1.5 },
      { text: "dua", start: 1.5, end: 2.0 },
    ]);
  });
});

describe("parseSubtitleJson", () => {
  it("accepts {words:[{text,start,end}]}", () => {
    const json = JSON.stringify({
      words: [
        { text: "Satu", start: 0, end: 0.5 },
        { text: "Dua", start: 0.5, end: 1 },
      ],
    });
    expect(parseSubtitleJson(json)).toEqual([
      { text: "Satu", start: 0, end: 0.5 },
      { text: "Dua", start: 0.5, end: 1 },
    ]);
  });

  it("accepts an array of {text,start,end} objects", () => {
    const json = JSON.stringify([{ text: "Halo", start: 1, end: 2 }]);
    expect(parseSubtitleJson(json)).toEqual([{ text: "Halo", start: 1, end: 2 }]);
  });

  it("accepts an array of [text,start,end] tuples and sorts by start", () => {
    const json = JSON.stringify([["B", 1, 2], ["A", 0, 0.5]]);
    expect(parseSubtitleJson(json)).toEqual([
      { text: "A", start: 0, end: 0.5 },
      { text: "B", start: 1, end: 2 },
    ]);
  });

  it("rejects non-finite or non-numeric times with a clear error", () => {
    expect(() => parseSubtitleJson('[{"text":"A","start":"x","end":1}]')).toThrow(/angka/);
    expect(() => parseSubtitleJson('[{"text":"A","start":null,"end":1}]')).toThrow(/angka/);
    // 1e999 parses to Infinity, which must be rejected as non-finite
    expect(() => parseSubtitleJson('[{"text":"A","start":0,"end":1e999}]')).toThrow(/angka/);
  });

  it("rejects start >= end and negative times", () => {
    expect(() => parseSubtitleJson('[{"text":"A","start":2,"end":2}]')).toThrow(/harus lebih kecil dari end/);
    expect(() => parseSubtitleJson('[{"text":"A","start":3,"end":1}]')).toThrow(/harus lebih kecil dari end/);
    expect(() => parseSubtitleJson('[["A",-1,1]]')).toThrow(/negatif/);
  });

  it("rejects bad JSON, unknown shapes and empty text", () => {
    expect(() => parseSubtitleJson("{oops")).toThrow(/JSON/);
    expect(() => parseSubtitleJson('{"nope":true}')).toThrow(/Struktur JSON tidak dikenal/);
    expect(() => parseSubtitleJson('["hanya string"]')).toThrow(/format tidak dikenal/);
    expect(() => parseSubtitleJson('[{"text":"  ","start":0,"end":1}]')).toThrow(/text harus string/);
  });
});

describe("parseSubtitleFile", () => {
  it("dispatches on extension and sorts the result", () => {
    const srtResult = parseSubtitleFile("sub.srt", "1\n00:00:01,000 --> 00:00:02,000\nSatu dua");
    expect(srtResult).toEqual({
      ok: true,
      words: [
        { text: "Satu", start: 1.0, end: 1.5 },
        { text: "dua", start: 1.5, end: 2.0 },
      ],
    });
    const vttResult = parseSubtitleFile("sub.VTT", "WEBVTT\n\n00:01.000 --> 00:02.000\nTiga");
    expect(vttResult).toEqual({ ok: true, words: [{ text: "Tiga", start: 1.0, end: 2.0 }] });
    const jsonResult = parseSubtitleFile("sub.json", '[["B",1,2],["A",0,0.5]]');
    expect(jsonResult).toEqual({
      ok: true,
      words: [
        { text: "A", start: 0, end: 0.5 },
        { text: "B", start: 1, end: 2 },
      ],
    });
  });

  it("tries SRT then VTT for .txt files", () => {
    expect(parseSubtitleFile("sub.txt", "1\n00:00:01,000 --> 00:00:02,000\nSatu dua").ok).toBe(true);
    expect(
      parseSubtitleFile("sub.txt", "WEBVTT\n\n00:01.000 --> 00:02.000\nSatu dua").ok,
    ).toBe(true);
  });

  it("rejects bad JSON, empty results and unknown extensions without throwing", () => {
    expect(parseSubtitleFile("sub.json", "{oops")).toEqual({
      ok: false,
      error: "Bukan file JSON yang valid.",
    });
    expect(parseSubtitleFile("sub.json", "[]")).toEqual({
      ok: false,
      error: "Tidak ada cue subtitle yang bisa dibaca dari file ini.",
    });
    expect(parseSubtitleFile("sub.srt", "teks tanpa cue").ok).toBe(false);
    expect(parseSubtitleFile("sub.docx", "apa pun").ok).toBe(false);
    expect(parseSubtitleFile("tanpa-ekstensi", "apa pun").ok).toBe(false);
    const rejected = parseSubtitleFile("sub.json", '[{"text":"A","start":2,"end":1}]');
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toMatch(/harus lebih kecil dari end/);
  });
});
