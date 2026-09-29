mod provider;

use std::path::PathBuf;
use std::sync::Arc;

use provider::{ClaudeCliProvider, InferenceProvider, InferenceRequest};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

struct AppState {
    provider: Arc<dyn InferenceProvider>,
}

#[derive(Clone, Serialize)]
struct Chunk {
    request_id: String,
    text: String,
}

/// Streams a completion: each chunk is emitted as an `llm-chunk` event, the full text
/// is the command's return value.
#[tauri::command]
async fn infer(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    system: String,
    prompt: String,
) -> Result<String, String> {
    let provider = state.provider.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let req = InferenceRequest { system, prompt };
        provider.stream(&req, &mut |text| {
            let _ = app.emit(
                "llm-chunk",
                Chunk { request_id: request_id.clone(), text: text.to_string() },
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Subjects live as one JSON file each in `Documents/Lantern/subjects`.
fn subjects_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| e.to_string())?;
    let dir = base.join("Lantern").join("subjects");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn subject_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err(format!("invalid subject id: {id}"));
    }
    Ok(subjects_dir(app)?.join(format!("{id}.json")))
}

#[tauri::command]
fn list_subjects(app: AppHandle) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    for entry in std::fs::read_dir(subjects_dir(&app)?).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().is_some_and(|e| e == "json") {
            if let Ok(text) = std::fs::read_to_string(&path) {
                out.push(text);
            }
        }
    }
    Ok(out)
}

#[tauri::command]
fn save_subject(app: AppHandle, id: String, json: String) -> Result<(), String> {
    let path = subject_path(&app, &id)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, json).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_subject(app: AppHandle, id: String) -> Result<(), String> {
    std::fs::remove_file(subject_path(&app, &id)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn subjects_folder(app: AppHandle) -> Result<String, String> {
    Ok(subjects_dir(&app)?.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let model = std::env::var("LANTERN_MODEL").ok().filter(|m| !m.is_empty());
    tauri::Builder::default()
        .manage(AppState { provider: Arc::new(ClaudeCliProvider { model }) })
        .invoke_handler(tauri::generate_handler![
            infer,
            list_subjects,
            save_subject,
            delete_subject,
            subjects_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lantern");
}
