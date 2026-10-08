//! UP-1..UP-50: the webview never contacts the update server; these commands do, and keep the found update for `install_update`.
use std::sync::Mutex;
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
pub struct Pending(pub Mutex<Option<Update>>);

#[derive(Serialize, Debug, PartialEq)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum Checked {
    UpToDate,
    Unconfigured,
    Available { version: String, current: String, notes: Option<String> },
}

/// A build with no public key or no endpoint has no working update channel (v010-release, UP-43).
pub fn configured(updater: Option<&Value>) -> bool {
    let Some(updater) = updater else { return false };
    let key = updater["pubkey"].as_str().is_some_and(|k| !k.trim().is_empty());
    let endpoints = updater["endpoints"].as_array().is_some_and(|e| e.iter().any(|u| u.as_str().is_some_and(|u| !u.trim().is_empty())));
    key && endpoints
}

#[tauri::command]
pub async fn check_update(app: AppHandle, pending: State<'_, Pending>) -> Result<Checked, String> {
    if !configured(app.config().plugins.0.get("updater")) { return Ok(Checked::Unconfigured); }
    let found = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    let result = match &found {
        Some(update) => Checked::Available { version: update.version.clone(), current: update.current_version.clone(), notes: update.body.clone() },
        None => Checked::UpToDate,
    };
    *pending.0.lock().map_err(|e| e.to_string())? = found;
    Ok(result)
}

/// The frontend flushes its saves first (UP-31). On Windows the passive NSIS installer closes the app and starts it again.
#[tauri::command]
pub async fn install_update(pending: State<'_, Pending>, progress: Channel<Value>) -> Result<(), String> {
    let update = pending.0.lock().map_err(|e| e.to_string())?.take().ok_or("No update has been found yet")?;
    let (mut downloaded, started, finished) = (0u64, progress.clone(), progress.clone());
    update.download_and_install(
        move |chunk, total| { downloaded += chunk as u64; let _ = started.send(json!({"event":"progress","downloaded":downloaded,"total":total})); },
        move || { let _ = finished.send(json!({"event":"installing"})); },
    ).await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unconfigured_until_key_and_endpoint_exist() {
        assert!(!configured(None));
        assert!(!configured(Some(&json!({"pubkey":"","endpoints":[]}))));
        assert!(!configured(Some(&json!({"pubkey":"KEY","endpoints":[]}))));
        assert!(!configured(Some(&json!({"pubkey":" ","endpoints":["https://x/latest.json"]}))));
        assert!(configured(Some(&json!({"pubkey":"KEY","endpoints":["https://x/latest.json"]}))));
    }
    #[test]
    fn available_serialises_for_the_webview() {
        let v = serde_json::to_value(Checked::Available { version: "0.1.3".into(), current: "0.1.2".into(), notes: None }).unwrap();
        assert_eq!(v, json!({"status":"available","version":"0.1.3","current":"0.1.2","notes":null}));
        assert_eq!(serde_json::to_value(Checked::UpToDate).unwrap(), json!({"status":"up-to-date"}));
    }
}
