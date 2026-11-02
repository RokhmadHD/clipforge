import { create } from "zustand";

export type JobStatus = "queued" | "running" | "done" | "failed";

/** Mirrors src-tauri/src/render.rs::RenderJob. */
export interface RenderJob {
  id: string;
  variantId: string;
  status: JobStatus;
  /** 0..1 */
  progress: number;
}

interface RenderState {
  jobs: RenderJob[];
  /** TODO(M1/M4): driven by Tauri events emitted from the Rust job queue. */
  upsert: (job: RenderJob) => void;
}

export const useRenderStore = create<RenderState>((set) => ({
  jobs: [],
  upsert: (job) =>
    set((s) => ({
      jobs: s.jobs.some((j) => j.id === job.id)
        ? s.jobs.map((j) => (j.id === job.id ? job : j))
        : [...s.jobs, job],
    })),
}));
