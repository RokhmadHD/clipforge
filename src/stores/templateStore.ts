import { create } from "zustand";
import type { TemplateManifest } from "../types/template";
import { loadTemplateIndex } from "../lib/templates";

interface TemplateState {
  templates: TemplateManifest[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  load: () => Promise<void>;
  byId: (id: string) => TemplateManifest | undefined;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  status: "idle",
  error: null,
  load: async () => {
    set({ status: "loading", error: null });
    try {
      set({ templates: await loadTemplateIndex(), status: "ready" });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  },
  byId: (id) => get().templates.find((t) => t.id === id),
}));
