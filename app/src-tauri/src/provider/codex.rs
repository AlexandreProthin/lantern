//! CE-58: Codex CLI, a second CLI provider on a ChatGPT plan, run as `codex exec --json`. Built from OpenAI's published
//! event schema (`codex-rs/exec/src/exec_events.rs`) and the non-interactive docs, without a recorded run.
use super::{classify, process, run_cli, Cancel, Completion, ErrorKind, InferenceProvider, ProviderError, Request, Streamed, ToolCalls, ToolUse, Usage};
use serde_json::Value;
use std::{collections::{BTreeMap, HashSet}, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}, time::{Duration, Instant}};

pub struct CodexCliProvider { pub executable: PathBuf, pub stall_timeout: Duration }
impl CodexCliProvider { pub fn new(executable: PathBuf) -> Self { Self { executable, stall_timeout: Duration::from_secs(120) } } }
/// The efforts Lantern sends; Codex names the same levels (`model_reasoning_effort`).
const EFFORTS: [&str; 5] = ["low", "medium", "high", "xhigh", "max"];
/// A TOML string for `-c key=value`; JSON's escapes are valid TOML basic-string escapes.
fn toml_string(value: &str) -> String { serde_json::to_string(value).unwrap_or_else(|_| "\"\"".into()) }
/// IP-20, CE-55: no shell, no user config, rules, MCP servers or AGENTS.md, no saved session; a read-only sandbox that
/// never asks; live web search only when the call asks for the web. The system prompt replaces Codex's own
/// instructions through a file (a long prompt would not fit Windows' command line); the prompt comes on stdin (`-`).
pub fn args(req: &Request, instructions: &Path) -> Vec<String> {
    let mut args: Vec<String> = ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--color", "never", "--sandbox", "read-only"].map(String::from).into();
    let config = [
        "approval_policy=\"never\"".to_string(), "features.shell_tool=false".into(), "project_doc_max_bytes=0".into(),
        format!("web_search={}", if req.web { "\"live\"" } else { "\"disabled\"" }),
        format!("model_instructions_file={}", toml_string(&instructions.to_string_lossy())),
    ];
    for c in config { args.extend(["-c".into(), c]); }
    if let Some(effort) = &req.effort { args.extend(["-c".into(), format!("model_reasoning_effort={}", toml_string(effort))]); }
    if let Some(model) = &req.model { args.extend(["--model".into(), model.clone()]); }
    args.push("-".into());
    args
}
/// npm installs `codex.cmd`; the standalone installers put `codex.exe` on PATH or in `~/.codex/bin`.
pub fn detect() -> Option<PathBuf> {
    let mut folders: Vec<PathBuf> = std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
    if let Some(appdata) = std::env::var_os("APPDATA") { folders.push(PathBuf::from(appdata).join("npm")); }
    if let Some(home) = std::env::var_os("USERPROFILE") { folders.push(PathBuf::from(&home).join(".codex/bin")); folders.push(PathBuf::from(home).join(".local/bin")); }
    for folder in folders { for name in ["codex.exe", "codex.cmd", "codex"] {
        let path = folder.join(name); if path.is_file() { return Some(path); }
    } }
    None
}
/// `codex login status` exits 0 when signed in (ChatGPT or an API key), non-zero otherwise.
pub fn signed_in(executable: &Path) -> Result<bool, String> {
    let output = process::command(executable).args(["login", "status"]).current_dir(std::env::temp_dir()).output().map_err(|e| e.to_string())?;
    Ok(output.status.success())
}
/// IP-10 for Codex: its wording first, then the shared rules.
pub fn classify_codex(details: &str) -> ErrorKind {
    let t = details.to_lowercase();
    if ["not logged in", "codex login", "sign in again", "token expired", "refresh token"].iter().any(|p| t.contains(p)) { ErrorKind::NotLoggedIn }
    else if ["stream disconnected", "reconnecting", "error sending request", "connection reset"].iter().any(|p| t.contains(p)) { ErrorKind::Network }
    else if t.contains("model") && t.contains("not supported") { ErrorKind::ModelUnknown }
    else { classify(details) }
}
#[derive(Default)]
pub struct CodexParser { pub text: String, pub invalid_lines: usize, pub events: usize, pub usage: Option<Usage>, pub failure: Option<String>,
    /// The last `error` event; Codex also sends these for retries it then recovers from, so only a run with no completed turn fails on it.
    pub last_error: Option<String>, message_id: Option<String>, message_base: usize, tool_ids: HashSet<String>, pub tool_calls: BTreeMap<String, u64> }
impl CodexParser {
    pub fn consume(&mut self, line: &str, on_event: &mut dyn FnMut(Streamed)) -> bool {
        let Ok(v) = serde_json::from_str::<Value>(line) else { self.invalid_lines += 1; return false; };
        let Some(kind) = v["type"].as_str() else { self.invalid_lines += 1; return false; };
        self.events += 1;
        match kind {
            "item.started" | "item.updated" | "item.completed" => self.item(&v["item"], on_event),
            "turn.completed" => {
                let u = &v["usage"]; let get = |key: &str| u[key].as_u64().unwrap_or(0);
                // OpenAI counts cached tokens inside `input_tokens`; Lantern's input, like Claude's, excludes them.
                let cached = get("cached_input_tokens");
                self.usage = Some(Usage { input: get("input_tokens").saturating_sub(cached), output: get("output_tokens"), thinking: get("reasoning_output_tokens"), cache_read: cached, cache_write: get("cache_write_input_tokens") });
            }
            "turn.failed" => self.failure = Some(message(&v["error"])),
            "error" => self.last_error = v["message"].as_str().map(String::from),
            _ => {}
        }
        true
    }
    fn item(&mut self, item: &Value, on_event: &mut dyn FnMut(Streamed)) {
        // Codex before 0.44 named the field `item_type` and agent messages `assistant_message`.
        let kind = item["type"].as_str().or_else(|| item["item_type"].as_str()).unwrap_or("");
        let id = item["id"].as_str().unwrap_or("").to_string();
        match kind {
            "agent_message" | "assistant_message" => {
                let text = item["text"].as_str().unwrap_or("");
                if self.message_id.as_deref() != Some(id.as_str()) {
                    // A second message with no tool use between: a paragraph break, as one answer.
                    if !self.text.is_empty() { self.text.push_str("\n\n"); on_event(Streamed::Text("\n\n")); }
                    self.message_id = Some(id); let start = self.text.len(); self.text.push_str(text); if !text.is_empty() { on_event(Streamed::Text(&self.text[start..])); }
                    self.message_base = start;
                } else {
                    let shown = &self.text[self.message_base..];
                    if let Some(rest) = text.strip_prefix(shown) { if !rest.is_empty() { let rest = rest.to_string(); self.text.push_str(&rest); on_event(Streamed::Text(&rest)); } }
                    else { self.text.truncate(self.message_base); self.text.push_str(text); }
                }
            }
            // IP-13, IP-19: one count per id; the text before it is not the answer.
            "web_search" => if self.tool_ids.insert(id) {
                *self.tool_calls.entry("WebSearch".into()).or_default() += 1; self.text.clear(); self.message_id = None; self.message_base = 0;
                on_event(Streamed::Tool(&ToolUse { name: "WebSearch".into(), detail: item["query"].as_str().unwrap_or("").into() }));
            },
            // Lantern turns the shell off and loads no MCP server; any other tool is still counted (IP-6).
            "command_execution" | "mcp_tool_call" | "file_change" => if self.tool_ids.insert(id) { *self.tool_calls.entry(kind.into()).or_default() += 1; },
            _ => {}
        }
    }
    fn tool_calls(&self) -> ToolCalls { (!self.tool_calls.is_empty()).then(|| self.tool_calls.clone()) }
    pub fn error(&self, kind: ErrorKind, details: String, model: &str, elapsed: Duration) -> ProviderError {
        ProviderError { kind, details, model: model.into(), usage: self.usage.clone().unwrap_or_default(), duration_ms: elapsed.as_millis() as u64, tool_calls: self.tool_calls() }
    }
    pub fn finish(self, exit_ok: bool, stderr: String, model: &str, effort: Option<String>, elapsed: Duration) -> Result<Completion, ProviderError> {
        if let Some(failure) = &self.failure { return Err(self.error(classify_codex(&format!("{failure}\n{stderr}")), format!("{failure}\n{stderr}").trim().into(), model, elapsed)); }
        let Some(usage) = self.usage.clone() else {
            let said = self.last_error.clone().unwrap_or_default();
            let details = format!("No completed turn; {} invalid lines. {said}\n{stderr}", self.invalid_lines).trim().to_string();
            let kind = if !said.is_empty() || !stderr.trim().is_empty() { classify_codex(&format!("{said}\n{stderr}")) } else if !exit_ok { ErrorKind::ProcessCrashed } else { ErrorKind::Protocol };
            return Err(self.error(kind, details, model, elapsed));
        };
        if self.text.is_empty() { return Err(self.error(ErrorKind::Protocol, "The turn completed with no agent message".into(), model, elapsed)); }
        Ok(Completion { text: self.text.clone(), model: model.into(), usage, duration_ms: elapsed.as_millis() as u64, cost_usd: None, tool_calls: self.tool_calls(), outcome: "ok".into(), resolved_effort: effort, usage_estimated: None, served_model: None })
    }
}
fn message(v: &Value) -> String { v["message"].as_str().or_else(|| v.as_str()).unwrap_or("").to_string() }
/// One instructions file per call, removed when the call ends.
struct Instructions(PathBuf);
impl Drop for Instructions { fn drop(&mut self) { let _ = std::fs::remove_file(&self.0); } }
static CALLS: AtomicU64 = AtomicU64::new(0);
impl InferenceProvider for CodexCliProvider {
    fn stream(&self, req: &Request, cancel: Cancel, on_event: &mut dyn FnMut(Streamed)) -> Result<Completion, ProviderError> {
        let start = Instant::now(); let mut parser = CodexParser::default();
        // The model the log keeps: the one asked for, or `default` when Codex picks (it does not say which).
        let model = req.model.clone().unwrap_or_else(|| "default".into());
        let initial_error = |kind, details| ProviderError { kind, details, model: model.clone(), usage: Usage::default(), duration_ms: start.elapsed().as_millis() as u64, tool_calls: None };
        if cancel.load(Ordering::SeqCst) { return Err(initial_error(ErrorKind::Cancelled, String::new())); }
        if req.effort.as_ref().is_some_and(|e| !EFFORTS.contains(&e.as_str())) { return Err(initial_error(ErrorKind::Protocol, "Invalid effort".into())); }
        let file = Instructions(std::env::temp_dir().join(format!("lantern-codex-{}-{}.md", std::process::id(), CALLS.fetch_add(1, Ordering::SeqCst))));
        std::fs::write(&file.0, &req.system).map_err(|e| initial_error(ErrorKind::ProcessCrashed, format!("Could not write the instructions file: {e}")))?;
        let mut cmd = process::command(&self.executable); cmd.args(args(req, &file.0));
        let run = run_cli(cmd, req.prompt.clone(), &cancel, self.stall_timeout, &mut |line| parser.consume(line, on_event)).map_err(|(kind, details)| initial_error(kind, details))?;
        if let Some((kind, details)) = run.failure { return Err(parser.error(kind, details, &model, start.elapsed())); }
        if run.write_failed { return Err(parser.error(ErrorKind::ProcessCrashed, "Could not write prompt to Codex".into(), &model, start.elapsed())); }
        parser.finish(run.exit_ok, run.stderr, &model, req.effort.clone(), start.elapsed())
    }
}
#[cfg(test)] #[path = "codex_tests.rs"] mod tests;
