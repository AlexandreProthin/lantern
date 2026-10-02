//! The storage bridge is serialized: no two frontend invocations write concurrently.
use std::{path::PathBuf, sync::Mutex};
use serde_json::Value;
use tauri::{AppHandle, Manager, State};
use crate::storage::{self, AppState, Loaded, SaveResult, Stamp};
pub struct StorageLock(pub Mutex<()>);
fn config(app: &AppHandle) -> Result<PathBuf, String> { app.path().config_dir().map(|p| p.join("Lantern")).map_err(|e| e.to_string()) }
#[tauri::command]
pub fn default_library(app: AppHandle) -> Result<PathBuf, String> { app.path().document_dir().map(|p| p.join("Lantern")).map_err(|e| e.to_string()) }
#[tauri::command]
pub fn load_subject(library: PathBuf, id: String, lock: State<StorageLock>) -> Result<Loaded, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::load_subject(&library, &id)
}
#[tauri::command]
pub fn save_subject(library: PathBuf, subject: Value, expected: Option<Stamp>, dirty: bool, lock: State<StorageLock>) -> Result<SaveResult, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::save_subject(&library, &subject, expected.as_ref(), dirty)
}
#[tauri::command]
pub fn list_subjects(app: AppHandle, library: PathBuf, lock: State<StorageLock>) -> Result<Vec<Value>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::list_subjects(&library, &config(&app)?)
}
#[tauri::command]
pub fn record_open(app: AppHandle, id: String, at: String, lock: State<StorageLock>) -> Result<AppState, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::record_open(&config(&app)?, &id, &at)
}
#[tauri::command]
pub fn read_state(app: AppHandle, lock: State<StorageLock>) -> Result<AppState, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::read_state(&config(&app)?)
}
#[tauri::command]
pub fn delete_subject(app: AppHandle, library: PathBuf, id: String, lock: State<StorageLock>) -> Result<(), String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::delete_subject(&library, &config(&app)?, &id)
}
#[tauri::command]
pub fn import_poc(library: PathBuf, lock: State<StorageLock>) -> Result<Vec<String>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::import_poc(&library)
}
#[tauri::command]
pub fn load_settings(app: AppHandle, lock: State<StorageLock>) -> Result<Value, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let path = config(&app)?.join("settings.json");
    let mut recovered = false;
    let document = if path.exists() {
        let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
        match serde_json::from_slice::<Value>(&bytes) {
            Ok(doc) if doc.is_object() && doc["format"].as_str().is_some_and(|f| f.starts_with("lantern-settings/")) => doc,
            _ => {
                let suffix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
                storage::atomic_write(&path.with_file_name(format!("settings.json.corrupt-{suffix}")), &bytes)?;
                recovered = true; serde_json::json!({"format":"lantern-settings/1"})
            }
        }
    } else { serde_json::json!({"format":"lantern-settings/1"}) };
    let read_only = document["format"] != "lantern-settings/1";
    Ok(serde_json::json!({"document":document,"readOnly":read_only,"recovered":recovered,
        "defaultLibrary":app.path().document_dir().map_err(|e|e.to_string())?.join("Lantern"),
        "defaultName":std::env::var("USERNAME").unwrap_or_default()}))
}
#[tauri::command]
pub fn save_settings(app: AppHandle, document: Value, lock: State<StorageLock>) -> Result<(), String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    if document["format"] != "lantern-settings/1" { return Err("Settings are read-only".into()); }
    let path = config(&app)?.join("settings.json");
    if let Ok(bytes) = std::fs::read(&path) {
        if let Ok(previous) = serde_json::from_slice::<Value>(&bytes) {
            if previous["format"].as_str().is_some_and(|f| f != "lantern-settings/1" && f.starts_with("lantern-settings/")) { return Err("Newer settings are read-only".into()); }
        }
    }
    storage::write_json(&path, &document)
}
#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> { crate::paths::open_external(&url) }
