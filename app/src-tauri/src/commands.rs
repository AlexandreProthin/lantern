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
