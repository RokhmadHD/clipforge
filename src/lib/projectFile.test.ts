import { describe, expect, it } from "vitest";
import { createSampleProject } from "./sampleProject";
import { parseProjectFile, projectFileName, serializeProject } from "./projectFile";

describe("serializeProject / parseProjectFile", () => {
  it("round-trips the sample project", () => {
    const project = createSampleProject();
    const parsed = parseProjectFile(serializeProject(project));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project).toEqual(project);
    }
  });

  it("rejects invalid JSON", () => {
    const parsed = parseProjectFile("{not json");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/JSON/);
  });

  it("rejects non-object payloads", () => {
    expect(parseProjectFile(JSON.stringify([1, 2])).ok).toBe(false);
    expect(parseProjectFile(JSON.stringify("hello")).ok).toBe(false);
  });

  it("rejects unsupported versions", () => {
    const project = createSampleProject();
    const parsed = parseProjectFile(JSON.stringify({ ...project, version: 99 }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/tidak didukung/);
  });

  it("rejects projects missing required fields", () => {
    const project = createSampleProject();
    const { words, ...rest } = project;
    void words;
    expect(parseProjectFile(JSON.stringify(rest)).ok).toBe(false);
  });
});

describe("projectFileName", () => {
  it("sanitizes the project name", () => {
    expect(projectFileName({ ...createSampleProject(), meta: { name: "Short Krakatau 1883!", width: 1, height: 1, fps: 30 } })).toBe(
      "Short_Krakatau_1883.clipforge.json",
    );
  });

  it("falls back to 'project' for an empty name", () => {
    expect(projectFileName({ ...createSampleProject(), meta: { name: "   ", width: 1, height: 1, fps: 30 } })).toBe(
      "project.clipforge.json",
    );
  });
});
