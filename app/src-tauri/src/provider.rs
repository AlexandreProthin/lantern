//! IP: blocking per-call provider, callback on the calling worker thread.
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, io::{BufRead, BufReader, Read, Write}, path::PathBuf, process::Stdio,
    sync::{Arc, atomic::{AtomicBool, Ordering}, mpsc}, time::{Duration, Instant}};
mod stream;
mod process;
pub mod endpoint;
pub mod codex;
pub mod keys;
pub mod commands;
pub use stream::StreamParser;
/// IP-6: tool uses per tool name, absent when the call used none.
pub type ToolCalls = Option<BTreeMap<String, u64>>;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Usage { pub input: u64, pub output: u64, pub thinking: u64, pub cache_read: u64, pub cache_write: u64 }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ErrorKind { NotInstalled, NotLoggedIn, UsageLimit, ModelUnknown, Network, ProcessCrashed, Protocol, Cancelled,
    /// CE-40: endpoints only.
    Unreachable, KeyRejected, ContextTooLong }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Completion { pub text: String, pub model: String, pub usage: Usage, pub duration_ms: u64,
    pub cost_usd: Option<f64>, #[serde(skip_serializing_if = "Option::is_none")] pub tool_calls: ToolCalls, pub outcome: String, pub resolved_effort: Option<String>,
    /// CE-50: the usage is Lantern's estimate, the server reported none (endpoints only).
    #[serde(default, skip_serializing_if = "Option::is_none")] pub usage_estimated: Option<bool>,
    /// CE-27: the name the server answered with, when it is not the model asked for (endpoints only).
    #[serde(default, skip_serializing_if = "Option::is_none")] pub served_model: Option<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderError { pub kind: ErrorKind, pub details: String, pub model: String, pub usage: Usage, pub duration_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")] pub tool_calls: ToolCalls }
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request { pub request_id: String, pub system: String, pub prompt: String, pub model: Option<String>, pub effort: Option<String>, #[serde(default)] pub web: bool }
/// IP-13: what a tool use shows while the call runs.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ToolUse { pub name: String, pub detail: String }
/// IP-4, IP-13: a text chunk, or a tool use that closes the text before it.
pub enum Streamed<'a> { Text(&'a str), Tool(&'a ToolUse) }
pub type Cancel = Arc<AtomicBool>;
pub trait InferenceProvider: Send + Sync {
    fn stream(&self, request: &Request, cancel: Cancel, on_event: &mut dyn FnMut(Streamed)) -> Result<Completion, ProviderError>;
}
pub struct ClaudeCliProvider { pub executable: PathBuf, pub stall_timeout: Duration }
impl ClaudeCliProvider { pub fn new(executable: PathBuf) -> Self { Self { executable, stall_timeout: Duration::from_secs(120) } } }
/// IP-20, IP-60: no tool at all, or WebSearch and WebFetch only when the call asks for the web.
pub fn args(req: &Request) -> Vec<String> {
    let mut args: Vec<String> = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--safe-mode", "--strict-mcp-config", "--no-session-persistence"].map(String::from).into();
    if req.web { args.extend(["--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch", "WebFetch"].map(String::from)); } else { args.extend(["--tools".into(), String::new()]); }
    args.extend(["--system-prompt".into(), req.system.clone()]);
    if let Some(model) = &req.model { args.extend(["--model".into(), model.clone()]); }
    if let Some(effort) = &req.effort { args.extend(["--effort".into(), effort.clone()]); }
    args
}
/// IP-20: a web call runs WebFetch's helper on Opus 5.5, not Haiku 4.5.
pub fn env(req: &Request) -> Vec<(&'static str, &'static str)> {
    if req.web { vec![("ANTHROPIC_DEFAULT_HAIKU_MODEL", "claude-opus-5-5")] } else { Vec::new() }
}
pub fn detect() -> Option<PathBuf> {
    let mut folders: Vec<PathBuf> = std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
    if let Some(home) = std::env::var_os("USERPROFILE") { folders.push(PathBuf::from(home).join(".local/bin")); }
    if let Some(appdata) = std::env::var_os("APPDATA") { folders.push(PathBuf::from(appdata).join("npm")); }
    if let Some(local) = std::env::var_os("LOCALAPPDATA") { folders.push(PathBuf::from(local).join("Programs/claude")); }
    for folder in folders { for name in ["claude.exe", "claude.cmd", "claude"] {
        let path = folder.join(name); if path.is_file() { return Some(path); }
    } }
    None
}
pub fn classify(details: &str) -> ErrorKind {
    let t = details.to_lowercase();
    if ["/login", "not logged", "not signed", "authentication", "unauthorized", "401", "please log in", "please login"].iter().any(|p| t.contains(p)) { ErrorKind::NotLoggedIn }
    else if ["rate limit", "usage limit", "quota", "overloaded", "429", "limit reached", "hit your limit"].iter().any(|p| t.contains(p)) { ErrorKind::UsageLimit }
    else if t.contains("model") && ["unknown", "invalid", "not found", "unavailable", "not available", "does not exist", "may not exist", "not have access", "does not support this model", "requires usage credits"].iter().any(|p| t.contains(p)) { ErrorKind::ModelUnknown }
    else if ["connection", "timeout", "dns", "fetch failed", "network", "econn", "enotfound"].iter().any(|p| t.contains(p)) { ErrorKind::Network }
    else { ErrorKind::ProcessCrashed }
}
impl InferenceProvider for ClaudeCliProvider {
    fn stream(&self, req: &Request, cancel: Cancel, on_event: &mut dyn FnMut(Streamed)) -> Result<Completion, ProviderError> {
        let start = Instant::now(); let mut parser = StreamParser::default();
        let initial_error = |kind, details| ProviderError { kind, details, model: String::new(), usage: Usage::default(), duration_ms: start.elapsed().as_millis() as u64, tool_calls: None };
        if cancel.load(Ordering::SeqCst) { return Err(initial_error(ErrorKind::Cancelled, String::new())); }
        if req.effort.as_ref().is_some_and(|e| !["low", "medium", "high", "xhigh", "max"].contains(&e.as_str())) { return Err(initial_error(ErrorKind::Protocol, "Invalid effort".into())); }
        let mut cmd = process::command(&self.executable);
        cmd.args(args(req)).envs(env(req));
        let run = run_cli(cmd, req.prompt.clone(), &cancel, self.stall_timeout, &mut |line| parser.consume(line, on_event)).map_err(|(kind, details)| initial_error(kind, details))?;
        if let Some((kind, details)) = run.failure { return Err(parser.error(kind, details, start.elapsed())); }
        if run.write_failed { return Err(parser.error(ErrorKind::ProcessCrashed, "Could not write prompt to CLI".into(), start.elapsed())); }
        parser.finish(run.exit_ok, run.stderr, req.effort.clone(), start.elapsed(), &mut |t| on_event(Streamed::Text(t)))
    }
}
/// What a CLI run left: the failure that stopped it, if any, its exit status and stderr, and whether the prompt was written.
pub(crate) struct Run { pub failure: Option<(ErrorKind, String)>, pub exit_ok: bool, pub stderr: String, pub write_failed: bool }
/// IP-20, IP-28: the spawn, prompt, read, stall and cancel loop every CLI provider shares; `consume` reads one stdout
/// line and says whether it was an event. A spawn failure is `NotInstalled` when the executable is gone.
pub(crate) fn run_cli(mut cmd: std::process::Command, prompt: String, cancel: &Cancel, stall_timeout: Duration, consume: &mut dyn FnMut(&str) -> bool) -> Result<Run, (ErrorKind, String)> {
    cmd.current_dir(std::env::temp_dir()).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| (if e.kind() == std::io::ErrorKind::NotFound { ErrorKind::NotInstalled } else { ErrorKind::ProcessCrashed }, e.to_string()))?;
    let job = match process::ProcessTree::attach(&child) { Ok(job) => job, Err(e) => { let _ = child.kill(); let _ = child.wait(); return Err((ErrorKind::ProcessCrashed, e)); } };
    let mut stdin = child.stdin.take().expect("piped stdin");
    let writer = std::thread::spawn(move || stdin.write_all(prompt.as_bytes()));
    let stdout = child.stdout.take().expect("piped stdout"); let stderr = child.stderr.take().expect("piped stderr");
    let errors = std::thread::spawn(move || { let mut bytes = Vec::new(); let mut reader = BufReader::new(stderr);
        let mut chunk = [0u8; 4096]; while let Ok(n) = reader.read(&mut chunk) { if n == 0 { break; } bytes.extend_from_slice(&chunk[..n]); if bytes.len() > 65536 { bytes.drain(..bytes.len()-65536); } } String::from_utf8_lossy(&bytes).into_owned() });
    let (tx, rx) = mpsc::sync_channel(128);
    let reader = std::thread::spawn(move || { for line in BufReader::new(stdout).lines() { if tx.send(line).is_err() { break; } } });
    let mut last_event = Instant::now(); let mut failure = None;
    loop {
        if cancel.load(Ordering::SeqCst) { failure = Some((ErrorKind::Cancelled, String::new())); break; }
        if last_event.elapsed() >= stall_timeout { failure = Some((ErrorKind::Protocol, format!("Stream stalled for {} seconds", stall_timeout.as_secs()))); break; }
        match rx.recv_timeout(Duration::from_millis(25)) {
            Ok(Ok(line)) => { if consume(&line) { last_event = Instant::now(); } }
            Ok(Err(e)) => { failure = Some((ErrorKind::Protocol, e.to_string())); break; }
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
    if failure.is_some() { job.kill(); let _ = child.kill(); }
    // Drop the receiver before joining to unblock a full bounded channel on cancel.
    drop(rx);
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Ok(status),
            Err(e) => break Err(e),
            Ok(None) => {
                if cancel.load(Ordering::SeqCst) { failure = Some((ErrorKind::Cancelled, String::new())); }
                else if last_event.elapsed() >= stall_timeout { failure = Some((ErrorKind::Protocol, "Stream stalled after stdout closed".into())); }
                if failure.is_some() { job.kill(); let _ = child.kill(); }
                std::thread::sleep(Duration::from_millis(25));
            }
        }
    };
    drop(job);
    let _ = reader.join(); let write_result = writer.join(); let stderr = errors.join().unwrap_or_default();
    Ok(Run { failure, exit_ok: status.map(|s| s.success()).unwrap_or(false), stderr, write_failed: write_result.is_err() || write_result.is_ok_and(|r| r.is_err()) })
}
pub fn version(executable: &std::path::Path) -> Result<String, String> {
    let output = process::command(executable).arg("--version").current_dir(std::env::temp_dir()).output().map_err(|e| e.to_string())?;
    if !output.status.success() { return Err(String::from_utf8_lossy(&output.stderr).into_owned()); }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
#[cfg(test)] mod tests;
