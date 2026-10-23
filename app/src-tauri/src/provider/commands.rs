use super::*;
use super::endpoint::{Endpoint, EndpointProvider, ModelInfo};
use super::codex::{self, CodexCliProvider};
use super::keys;
use std::{collections::HashMap, sync::Mutex};
use tauri::{State, ipc::Channel};
pub struct Calls { pub active: Mutex<HashMap<String, Cancel>>, pub executable: Mutex<Option<PathBuf>>,
    /// CE-58: Codex is looked for when first asked, so a machine without it never pays for the search at start-up.
    pub codex: Mutex<Option<PathBuf>> }
impl Default for Calls { fn default() -> Self { Self { active: Mutex::new(HashMap::new()), executable: Mutex::new(detect()), codex: Mutex::new(None) } } }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Chunk { request_id: String, #[serde(skip_serializing_if = "Option::is_none")] text: Option<String>, #[serde(skip_serializing_if = "Option::is_none")] tool: Option<ToolUse> }
#[tauri::command]
pub async fn generate(request: Request, endpoint: Option<Endpoint>, cli: Option<String>, channel: Channel<Chunk>, calls: State<'_, Calls>) -> Result<Completion, ProviderError> {
    run(request, endpoint, cli, &calls, move |chunk| { let _ = channel.send(chunk); }).await
}
/// NW-30: the call itself, for the Tauri channel and for the network server's stream alike.
pub async fn run(request: Request, endpoint: Option<Endpoint>, cli: Option<String>, calls: &Calls, send: impl FnMut(Chunk) + Send + 'static) -> Result<Completion, ProviderError> {
    let mut send = send;
    let error = |kind, details: &str| ProviderError { kind, details: details.into(), model: String::new(), usage: Usage::default(), duration_ms: 0, tool_calls: None };
    // CE-26: an endpoint call needs no Claude Code; a call without an endpoint or `cli` is the CLI call it always was.
    let provider: Box<dyn InferenceProvider> = match (endpoint, cli.as_deref()) {
        (Some(endpoint), _) => Box::new(EndpointProvider::new(endpoint)),
        // CE-58: a Codex call.
        (None, Some("codex")) => Box::new(CodexCliProvider::new(codex_executable(calls).ok_or_else(|| ProviderError { model: request.model.clone().unwrap_or_else(|| "default".into()), ..error(ErrorKind::NotInstalled, "Codex CLI was not found") })?)),
        (None, Some(other)) => return Err(error(ErrorKind::Protocol, &format!("Unknown CLI provider {other}"))),
        (None, None) => Box::new(ClaudeCliProvider::new(calls.executable.lock().map_err(|_| error(ErrorKind::ProcessCrashed, "Detection registry poisoned"))?.clone().ok_or_else(|| error(ErrorKind::NotInstalled, "Claude CLI was not found"))?)),
    };
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
        provider.stream(&request, cancel, &mut |event| { let request_id = request.request_id.clone(); send(match event {
            Streamed::Text(text) => Chunk { request_id, text: Some(text.into()), tool: None },
            Streamed::Tool(tool) => Chunk { request_id, text: None, tool: Some(tool.clone()) },
        }); })
    }).await;
    if let Ok(mut active) = calls.active.lock() { active.remove(&id); }
    result.map_err(|_| error(ErrorKind::ProcessCrashed, "Provider worker failed"))?
}
/// The Codex found earlier, or a new search.
fn codex_executable(calls: &Calls) -> Option<PathBuf> {
    let mut found = calls.codex.lock().ok()?;
    if found.as_ref().is_none_or(|p| !p.is_file()) { *found = codex::detect(); }
    found.clone()
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
/// CE-58, SE-40's Codex entry: found or not, its version, and whether `codex login status` says it is signed in.
#[tauri::command]
pub async fn codex_status(calls: State<'_, Calls>) -> Result<serde_json::Value, String> {
    let path = codex::detect(); *calls.codex.lock().map_err(|e| e.to_string())? = path.clone();
    tauri::async_runtime::spawn_blocking(move || match path {
        Some(path) => { let signed_in = codex::signed_in(&path).unwrap_or(false);
            Ok(serde_json::json!({"kind": if signed_in { "signed-in" } else { "not-logged-in" }, "version": version(&path).unwrap_or_default(), "path": path})) }
        None => Ok(serde_json::json!({"kind":"not-installed"})),
    }).await.map_err(|e| e.to_string())?
}
/// CE-21: the models an endpoint lists, fetched only when the user asks (IP-41's rule).
#[tauri::command]
pub async fn endpoint_models(endpoint: Endpoint) -> Result<Vec<String>, ProviderError> {
    tauri::async_runtime::spawn_blocking(move || endpoint::models(&endpoint)).await.map_err(|e| failure(ErrorKind::ProcessCrashed, e.to_string()))?.map_err(|(k, d)| failure(k, d))
}
/// CE-30, CE-52: a model's context size and thinking capability, where the server reports them.
#[tauri::command]
pub async fn endpoint_model_info(endpoint: Endpoint, model: String) -> Result<ModelInfo, ProviderError> {
    tauri::async_runtime::spawn_blocking(move || endpoint::model_info(&endpoint, &model)).await.map_err(|e| failure(ErrorKind::ProcessCrashed, e.to_string()))?.map_err(|(k, d)| failure(k, d))
}
fn failure(kind: ErrorKind, details: String) -> ProviderError { ProviderError { kind, details, model: String::new(), usage: Usage::default(), duration_ms: 0, tool_calls: None } }
/// CE-70, CE-72: the key comes from the password field once and is stored for this https address; the webview's copy is never sent back.
#[tauri::command]
pub async fn set_endpoint_key(endpoint_id: String, base_url: String, key: String) -> Result<keys::KeyStatus, String> {
    let key = zeroize::Zeroizing::new(key);
    tauri::async_runtime::spawn_blocking(move || keys::set(&endpoint_id, &base_url, key)).await.map_err(|e| e.to_string())?
}
/// CE-71: whether a key is set, its last 4 characters and its host, never the key.
#[tauri::command]
pub async fn endpoint_key_status(endpoint_id: String) -> Result<keys::KeyStatus, String> {
    tauri::async_runtime::spawn_blocking(move || keys::status(&endpoint_id)).await.map_err(|e| e.to_string())?
}
/// CE-75, CE-76: the frame confirms first; removing a missing key is fine.
#[tauri::command]
pub async fn remove_endpoint_key(endpoint_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || keys::remove(&endpoint_id)).await.map_err(|e| e.to_string())?
}
