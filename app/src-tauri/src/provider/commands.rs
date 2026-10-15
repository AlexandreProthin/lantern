use super::*;
use std::{collections::HashMap, sync::Mutex};
use tauri::{State, ipc::Channel};
pub struct Calls { pub active: Mutex<HashMap<String, Cancel>>, pub executable: Mutex<Option<PathBuf>> }
impl Default for Calls { fn default() -> Self { Self { active: Mutex::new(HashMap::new()), executable: Mutex::new(detect()) } } }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Chunk { request_id: String, #[serde(skip_serializing_if = "Option::is_none")] text: Option<String>, #[serde(skip_serializing_if = "Option::is_none")] tool: Option<ToolUse> }
#[tauri::command]
pub async fn generate(request: Request, channel: Channel<Chunk>, calls: State<'_, Calls>) -> Result<Completion, ProviderError> {
    let error = |kind, details: &str| ProviderError { kind, details: details.into(), model: String::new(), usage: Usage::default(), duration_ms: 0, tool_calls: None };
    let executable = calls.executable.lock().map_err(|_| error(ErrorKind::ProcessCrashed, "Detection registry poisoned"))?.clone().ok_or_else(|| error(ErrorKind::NotInstalled, "Claude CLI was not found"))?;
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut active = calls.active.lock().map_err(|_| error(ErrorKind::ProcessCrashed, "Call registry poisoned"))?;
        if let Some(previous) = active.get(&request.request_id) {
            if previous.load(Ordering::SeqCst) { active.remove(&request.request_id); return Err(error(ErrorKind::Cancelled, "")); }
            return Err(error(ErrorKind::Protocol, "Duplicate request id"));
        }
        active.insert(request.request_id.clone(), cancel.clone());
    }
    let id = request.request_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        ClaudeCliProvider::new(executable).stream(&request, cancel, &mut |event| { let request_id = request.request_id.clone(); let _ = channel.send(match event {
            Streamed::Text(text) => Chunk { request_id, text: Some(text.into()), tool: None },
            Streamed::Tool(tool) => Chunk { request_id, text: None, tool: Some(tool.clone()) },
        }); })
    }).await;
    if let Ok(mut active) = calls.active.lock() { active.remove(&id); }
    result.map_err(|_| error(ErrorKind::ProcessCrashed, "Provider worker failed"))?
}
#[tauri::command]
pub fn cancel_generation(request_id: String, calls: State<Calls>) {
    if let Ok(mut active) = calls.active.lock() {
        if let Some(cancel) = active.get(&request_id) { cancel.store(true, Ordering::SeqCst); }
        else if active.len() < 256 { active.insert(request_id, Arc::new(AtomicBool::new(true))); }
    }
}
#[tauri::command]
pub async fn provider_status(calls: State<'_, Calls>) -> Result<serde_json::Value, String> {
    let path = detect(); *calls.executable.lock().map_err(|e| e.to_string())? = path.clone();
    tauri::async_runtime::spawn_blocking(move || match path {
        Some(path) => Ok(serde_json::json!({"kind":"not-tested", "version":version(&path)?, "path":path})),
        None => Ok(serde_json::json!({"kind":"not-installed"})),
    }).await.map_err(|e| e.to_string())?
}
