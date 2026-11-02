import { describe, expect, it } from "vitest";
import { buildTemplateUrl, withDefaults } from "./templates";
import type { TemplateManifest } from "../types/template";

const manifest: TemplateManifest = {
  id: "fact-card",
  name: "Fact Card",
  kind: "overlay",
  size: [1080, 1920],
  fps: 30,
  defaultDuration: 3,
  params: {
    title: { type: "text", default: "1883" },
    accent: { type: "color", default: "#FFB84D" },
  },
};

describe("withDefaults", () => {
  it("fills missing params from manifest defaults", () => {
    expect(withDefaults(manifest, {})).toEqual({ title: "1883", accent: "#FFB84D" });
  });

  it("lets clip params override defaults", () => {
    expect(withDefaults(manifest, { title: "Krakatau" })).toEqual({ title: "Krakatau", accent: "#FFB84D" });
  });

  it("returns the clip params untouched without a manifest", () => {
    expect(withDefaults(undefined, { title: "x" })).toEqual({ title: "x" });
  });
});

describe("buildTemplateUrl", () => {
  it("encodes params, theme and duration as the runtime contract query", () => {
    const url = buildTemplateUrl({
      id: "fact-card",
      params: { title: "1883" },
      theme: { "--cf-accent": "#FFB84D" },
      duration: 2.5,
    });
    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe("/templates/fact-card/index.html");
    expect(JSON.parse(parsed.searchParams.get("p") ?? "")).toEqual({ title: "1883" });
    expect(JSON.parse(parsed.searchParams.get("theme") ?? "")).toEqual({ "--cf-accent": "#FFB84D" });
    expect(parsed.searchParams.get("d")).toBe("2.5");
    expect(parsed.searchParams.has("w")).toBe(false);
  });

  it("includes the word list only when the template needs words", () => {
    const url = buildTemplateUrl({
      id: "caption-karaoke",
      params: {},
      theme: {},
      duration: 1,
      words: [{ text: "hai", start: 0, end: 0.4 }],
    });
    const parsed = new URL(url, "http://localhost");
    expect(JSON.parse(parsed.searchParams.get("w") ?? "")).toEqual([{ text: "hai", start: 0, end: 0.4 }]);
  });
});
