import { PROJECT_VERSION, type Project } from "../types/project";

/**
 * Browser-native project file IO (works in vite dev and inside the Tauri webview).
 * Native dialog/fs plugin transport is a documented follow-up (see docs/agent-notes).
 */
export const FILE_EXTENSION = ".clipforge.json";

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, version: PROJECT_VERSION }, null, 2);
}

export type ParseResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

export function parseProjectFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Bukan file JSON yang valid." };
  }
  const p = data as Partial<Project> | null;
  if (typeof p !== "object" || p === null || Array.isArray(p)) {
    return { ok: false, error: "Struktur proyek tidak dikenal." };
  }
  if (p.version !== PROJECT_VERSION) {
    return { ok: false, error: `Versi proyek ${String(p.version)} tidak didukung (harus ${PROJECT_VERSION}).` };
  }
  if (
    typeof p.meta?.name !== "string" ||
    !Array.isArray(p.words) ||
    !Array.isArray(p.scenes) ||
    !Array.isArray(p.overlays) ||
    !Array.isArray(p.themes)
  ) {
    return { ok: false, error: "Field proyek tidak lengkap." };
  }
  return { ok: true, project: p as Project };
}

export function projectFileName(project: Project): string {
  const base = project.meta.name.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${base || "project"}${FILE_EXTENSION}`;
}

export function downloadProjectFile(project: Project): void {
  const blob = new Blob([serializeProject(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = projectFileName(project);
  anchor.click();
  URL.revokeObjectURL(url);
}
