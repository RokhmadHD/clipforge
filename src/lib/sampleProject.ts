import { PROJECT_VERSION, type Project, type Word } from "../types/project";

// [text, start, end] -- stand-in for real forced-alignment output (M3).
const RAW: Array<[string, number, number]> = [
  ["Pada", 0.0, 0.3], ["hari", 0.3, 0.6], ["ini,", 0.6, 1.0],
  ["Gunung", 1.2, 1.7], ["Krakatau", 1.7, 2.4], ["meletus.", 2.4, 3.1],
  ["Suaranya", 3.6, 4.2], ["terdengar", 4.2, 4.9], ["sampai", 4.9, 5.3],
  ["4.800", 5.3, 6.0], ["km.", 6.0, 6.5],
  ["Ikuti", 7.0, 7.3], ["kisahnya.", 7.3, 8.0],
];

const words: Word[] = RAW.map(([text, start, end]) => ({ text, start, end }));

/** Demo project used until real import exists. Mirrors the mockup ("Short Krakatau 1883"). */
export function createSampleProject(): Project {
  return {
    version: PROJECT_VERSION,
    meta: { name: "Short Krakatau 1883", width: 1080, height: 1920, fps: 30 },
    audio: { path: "", duration: 8.5 },
    words,
    assets: [],
    themes: [
      {
        id: "amber",
        name: "Amber",
        tokens: { "--cf-accent": "#FFB84D", "--cf-highlight": "#7C5CFF", "--cf-text": "#FFFFFF" },
      },
      {
        id: "violet",
        name: "Violet",
        tokens: { "--cf-accent": "#9C84FF", "--cf-highlight": "#FFB84D", "--cf-text": "#F4F1FF" },
      },
    ],
    activeThemeId: "amber",
    scenes: [],
    overlays: [
      {
        id: "clip-captions",
        template: "caption-karaoke",
        params: {},
        from: { word: 0, edge: "start" },
        to: { word: 12, edge: "end" },
        lane: 0,
      },
      {
        id: "clip-fact-1883",
        template: "fact-card",
        params: { title: "1883", body: "Letusan Krakatau terdengar sampai 4.800 km jauhnya." },
        from: { word: 6, edge: "start", offset: -0.2 },
        to: { word: 10, edge: "end" },
        lane: 1,
      },
    ],
    variants: [],
  };
}
