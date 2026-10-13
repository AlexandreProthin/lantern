//! The storage bridge is serialized: no two frontend invocations write concurrently.
use std::{path::PathBuf, sync::Mutex};
use serde_json::Value;
use tauri::{AppHandle, Manager, State};
use crate::storage::{self, AppState, Loaded, SaveResult, Stamp};
pub struct StorageLock(pub Mutex<()>);
fn config(app: &AppHandle) -> Result<PathBuf, String> { app.path().config_dir().map(|p| p.join("Lantern")).map_err(|e| e.to_string()) }
fn settings_major(doc:&Value)->Option<u32>{doc["format"].as_str()?.strip_prefix("lantern-settings/")?.parse::<u32>().ok().filter(|n|*n>=1)}
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
pub fn subject_thumbnail(library: PathBuf, id: String, room: String, lock: State<StorageLock>) -> Result<Value, String> {
    let _guard=lock.0.lock().map_err(|e|e.to_string())?; storage::thumbnail(&library,&id,&room)
}
#[tauri::command]
pub fn reveal_subject(library: PathBuf, id: String) -> Result<(), String> {
    crate::paths::reveal_file(&crate::paths::subject_path(&library,&id)?)
}
/// GV-56: the plain path of a subject's file, for *Copy path*.
#[tauri::command]
pub fn subject_file(library: PathBuf, id: String) -> Result<String, String> {
    Ok(crate::paths::plain_path(&crate::paths::subject_path(&library,&id)?.to_string_lossy()))
}
#[tauri::command]
pub fn import_poc(library: PathBuf, lock: State<StorageLock>) -> Result<Vec<String>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?; storage::import_poc(&library)
}
#[tauri::command]
pub fn load_settings(app: AppHandle, lock: State<StorageLock>) -> Result<Value, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    let path = config(&app)?.join("settings.json");
    let transfer_recovered=crate::library::recover_transfer(&path)?;
    let mut recovered = false;
    let document = if path.exists() {
        let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
        match serde_json::from_slice::<Value>(&bytes) {
            Ok(doc) if doc.is_object() && settings_major(&doc).is_some() => doc,
            _ => {
                let suffix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
                storage::atomic_write(&path.with_file_name(format!("settings.json.corrupt-{suffix}")), &bytes)?;
                recovered = true; serde_json::json!({"format":"lantern-settings/1"})
            }
        }
    } else { serde_json::json!({"format":"lantern-settings/1"}) };
    let mut document = document;
    if let Some(stored) = document["library"]["path"].as_str().map(crate::paths::plain_path) { document["library"]["path"] = serde_json::json!(stored); }
    let read_only = document["format"] != "lantern-settings/1";
    Ok(serde_json::json!({"document":document,"readOnly":read_only,"recovered":recovered,"transferRecovered":transfer_recovered,
        "defaultLibrary":app.path().document_dir().map_err(|e|e.to_string())?.join("Lantern"),
        "defaultName":std::env::var("USERNAME").unwrap_or_else(|_|"Learner".into())}))
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
#[tauri::command]
pub fn save_window_state(app:AppHandle, bounds:Value, lock:State<StorageLock>) -> Result<(),String> {
    let _guard=lock.0.lock().map_err(|e|e.to_string())?;
    for key in ["x","y","width","height"] {if bounds[key].as_f64().is_none_or(|n|!n.is_finite()){return Err("Invalid window bounds".into());}}
    let folder=config(&app)?;let mut state=storage::read_state(&folder)?;
    if state.format!="lantern-state/1"{return Err("Newer app state is read-only".into());}
    state.extra.insert("window".into(),bounds);storage::write_json(&folder.join("state.json"),&serde_json::to_value(state).map_err(|e|e.to_string())?)
}
fn install_folder() -> Result<PathBuf,String> { std::env::current_exe().map_err(|e|e.to_string())?.parent().map(PathBuf::from).ok_or("App folder is unavailable".into()) }
#[tauri::command]
pub async fn pick_library(title:String, start:Option<PathBuf>) -> Result<Option<PathBuf>,String> { tauri::async_runtime::spawn_blocking(move||crate::paths::pick_folder(&title,start.as_deref())).await.map_err(|e|e.to_string())? }
#[tauri::command]
pub fn validate_library(path:PathBuf) -> Result<PathBuf,String> { crate::library::validate_folder(&path,&install_folder()?) }
#[tauri::command]
pub fn reveal_library(path:PathBuf) -> Result<(),String> { crate::paths::reveal_folder(&path) }
#[tauri::command]
pub fn switch_library(app:AppHandle, old:PathBuf, destination:PathBuf, mode:String, document:Value, lock:State<StorageLock>) -> Result<Value,String> {
    let _guard=lock.0.lock().map_err(|e|e.to_string())?;
    if document["format"] != "lantern-settings/1" { return Err("Settings are read-only".into()); }
    let settings_path=config(&app)?.join("settings.json");
    if let Ok(bytes)=std::fs::read(&settings_path) { if let Ok(previous)=serde_json::from_slice::<Value>(&bytes) {
        if previous["format"].as_str().is_some_and(|f|f.starts_with("lantern-settings/") && f!="lantern-settings/1") { return Err("Newer settings are read-only".into()); }
    } }
    crate::library::switch_library(&old,&destination,&install_folder()?,&mode,&settings_path,&document)
}
