//! UP-1..UP-66: the webview never contacts the update server; these commands do, and keep the found update for `install_update`.
use std::{path::PathBuf, sync::Mutex};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{ipc::Channel, AppHandle, State, Url};
use tauri_plugin_updater::{Update, UpdaterExt};
use crate::local_feed::{LocalFeed, IDLE};

/// The found update, and the local folder server it downloads from (UP-63), which lives exactly as long as it.
#[derive(Default)]
pub struct Pending { update: Mutex<Option<Update>>, feed: Mutex<Option<LocalFeed>> }
impl Pending {
    fn set(&self, update: Option<Update>, feed: Option<LocalFeed>) -> Result<(), String> {
        *self.update.lock().map_err(|e| e.to_string())? = update;
        *self.feed.lock().map_err(|e| e.to_string())? = feed;
        Ok(())
    }
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum Checked {
    UpToDate,
    Unconfigured,
    Available { version: String, current: String, notes: Option<String> },
}

fn has_key(updater: Option<&Value>) -> bool { updater.is_some_and(|u| u["pubkey"].as_str().is_some_and(|k| !k.trim().is_empty())) }

/// A build with no public key or no endpoint has no working update channel (v010-release, UP-43).
pub fn configured(updater: Option<&Value>) -> bool {
    let endpoints = updater.is_some_and(|u| u["endpoints"].as_array().is_some_and(|e| e.iter().any(|u| u.as_str().is_some_and(|u| !u.trim().is_empty()))));
    has_key(updater) && endpoints
}

fn found(update: &Option<Update>) -> Checked {
    match update {
        Some(update) => Checked::Available { version: update.version.clone(), current: update.current_version.clone(), notes: update.body.clone() },
        None => Checked::UpToDate,
    }
}

/// `folder` set: the local update folder replaces GitHub (UP-61); the signature is still checked against the built-in key (UP-64).
#[tauri::command]
pub async fn check_update(app: AppHandle, pending: State<'_, Pending>, folder: Option<PathBuf>) -> Result<Checked, String> {
    pending.set(None, None)?;
    let config = app.config().plugins.0.get("updater");
    let Some(folder) = folder.filter(|f| !f.as_os_str().is_empty()) else {
        if !configured(config) { return Ok(Checked::Unconfigured); }
        let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
        let result = found(&update);
        pending.set(update, None)?;
        return Ok(result);
    };
    if !has_key(config) { return Ok(Checked::Unconfigured); }
    let feed = LocalFeed::start(&folder, IDLE)?;
    let endpoint = Url::parse(&feed.url("latest.json")).map_err(|e| e.to_string())?;
    let mut update = app.updater_builder().endpoints(vec![endpoint]).map_err(|e| e.to_string())?
        .build().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    if let Some(update) = update.as_mut() { update.download_url = Url::parse(&feed.url(&feed.installer)).map_err(|e| e.to_string())?; }
    let result = found(&update);
    let feed = update.is_some().then_some(feed);
    pending.set(update, feed)?;
    Ok(result)
}

/// UP-11, UP-63: *Later* lets the found update go, and with it the local server.
#[tauri::command]
pub fn release_update(pending: State<'_, Pending>) -> Result<(), String> { pending.set(None, None) }

/// The frontend flushes its saves first (UP-31). On Windows the passive NSIS installer closes the app and starts it again.
#[tauri::command]
pub async fn install_update(pending: State<'_, Pending>, progress: Channel<Value>) -> Result<(), String> {
    let update = pending.update.lock().map_err(|e| e.to_string())?.take().ok_or("No update has been found yet")?;
    let (mut downloaded, started, finished) = (0u64, progress.clone(), progress.clone());
    let result = update.download_and_install(
        move |chunk, total| { downloaded += chunk as u64; let _ = started.send(json!({"event":"progress","downloaded":downloaded,"total":total})); },
        move || { let _ = finished.send(json!({"event":"installing"})); },
    ).await.map_err(|e| e.to_string());
    pending.set(None, None)?;
    result
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
        assert!(has_key(Some(&json!({"pubkey":"KEY","endpoints":[]}))));
    }
    #[test]
    fn available_serialises_for_the_webview() {
        let v = serde_json::to_value(Checked::Available { version: "0.1.3".into(), current: "0.1.2".into(), notes: None }).unwrap();
        assert_eq!(v, json!({"status":"available","version":"0.1.3","current":"0.1.2","notes":null}));
        assert_eq!(serde_json::to_value(Checked::UpToDate).unwrap(), json!({"status":"up-to-date"}));
    }
}
