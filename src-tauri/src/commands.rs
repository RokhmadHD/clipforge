use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
}

/// Smoke-test command: proves the frontend <-> Rust bridge works.
#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        name: "ClipForge",
        version: env!("CARGO_PKG_VERSION"),
    }
}
