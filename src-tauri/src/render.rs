//! Render job model. The actual work is done by the Node sidecar in `renderer/`
//! (headless Chromium -> PNG frames -> FFmpeg). This module will own the job
//! queue, spawn the sidecar and stream progress events to the frontend.
//! See docs/ARCHITECTURE.md (section "Render pipeline").
#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Queued,
    Running,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderJob {
    pub id: String,
    /// Path to the project JSON (single source of truth).
    pub project_path: String,
    /// Theme/variant id to render (one job per variant).
    pub variant_id: String,
    pub status: JobStatus,
    /// 0.0 ..= 1.0
    pub progress: f32,
}
