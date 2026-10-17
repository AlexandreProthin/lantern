//! CE-10 to CE-14: the provider contract over HTTP, for OpenAI-compatible servers and Ollama's native chat.
use super::{keys, Cancel, Completion, ErrorKind, InferenceProvider, ProviderError, Request, Streamed, Usage};
use reqwest::{blocking::Client, header::{HeaderValue, AUTHORIZATION}, Url};
use zeroize::Zeroizing;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{io::{BufRead, BufReader, Read}, net::IpAddr, sync::{atomic::Ordering, mpsc}, time::{Duration, Instant}};

/// One entry of `provider.endpoints`, as the frame sends it with an endpoint call (CE-12, CE-30, CE-52, CE-80).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint { pub id: String, pub preset: String, pub base_url: String, #[serde(default)] pub context_size: Option<u64>,
    #[serde(default)] pub thinking: Option<String>, #[serde(default)] pub lan_confirmed: bool }
/// CE-32: the Ollama preset streams its chat through the native API (NDJSON); every other preset uses SSE.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Format { Sse, Ndjson }
impl Endpoint {
    pub fn format(&self) -> Format { if self.preset == "ollama" { Format::Ndjson } else { Format::Sse } }
    fn base(&self) -> &str { self.base_url.trim_end_matches('/') }
    /// The server root for native routes: the base URL without its `/v1`.
    fn root(&self) -> &str { let b = self.base(); b.strip_suffix("/v1").unwrap_or(b) }
    pub fn chat_url(&self) -> String { match self.format() { Format::Ndjson => format!("{}/api/chat", self.root()), Format::Sse => format!("{}/chat/completions", self.base()) } }
    fn thinking(&self) -> &str { self.thinking.as_deref().unwrap_or("off") }
}

/// CE-80: `http://` only for this machine or a LAN address the user confirmed; `https://` everywhere else.
pub fn check_url(e: &Endpoint) -> Result<Url, String> {
    let url = Url::parse(e.base()).map_err(|err| format!("Not a valid URL: {err}"))?;
    if !url.username().is_empty() || url.password().is_some() { return Err("The URL must not carry a user name or password".into()); }
    let host = url.host_str().ok_or("The URL has no host")?.trim_matches(['[', ']']).to_ascii_lowercase();
    match url.scheme() {
        "https" => Ok(url),
        "http" if is_loopback(&host) || (e.lan_confirmed && is_lan(&host)) => Ok(url),
        "http" => Err(format!("Lantern sends http:// only to this machine or a confirmed LAN address, not to {host}; use https://")),
        other => Err(format!("Unsupported scheme {other}://")),
    }
}
fn is_loopback(host: &str) -> bool { host == "localhost" || host.ends_with(".localhost") || host.parse::<IpAddr>().is_ok_and(|ip| ip.is_loopback()) }
fn is_lan(host: &str) -> bool {
    match host.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => ip.is_private() || ip.is_link_local(),
        Ok(IpAddr::V6(ip)) => (ip.segments()[0] & 0xfe00) == 0xfc00 || (ip.segments()[0] & 0xffc0) == 0xfe80,
        Err(_) => !host.contains('.') || [".local", ".lan", ".home.arpa", ".internal"].iter().any(|s| host.ends_with(s)),
    }
}

/// CE-10, CE-13, CE-32, CE-52: system and prompt as two messages, streamed, no tools; size and thinking per model.
pub fn body(e: &Endpoint, req: &Request) -> Value {
    let messages = json!([{"role": "system", "content": req.system}, {"role": "user", "content": req.prompt}]);
    let model = req.model.clone().unwrap_or_default();
    match e.format() {
        Format::Ndjson => {
            let mut b = json!({"model": model, "messages": messages, "stream": true});
            match e.thinking() { "off" => b["think"] = json!(false), "on" => b["think"] = json!(true), _ => {} }
            if let Some(n) = e.context_size { b["options"] = json!({"num_ctx": n}); }
            b
        }
        Format::Sse => {
            let mut b = json!({"model": model, "messages": messages, "stream": true, "stream_options": {"include_usage": true}});
            if e.thinking() == "off" { b["reasoning_effort"] = json!("none"); }
            b
        }
    }
}

/// CE-51: removes inline `<think>…</think>`, even when a tag is split across chunks.
#[derive(Default)]
pub struct ThinkFilter { held: String, inside: bool, pub removed: usize }
impl ThinkFilter {
    pub fn push(&mut self, chunk: &str) -> String {
        self.held.push_str(chunk); let mut out = String::new();
        loop {
            let tag = if self.inside { "</think>" } else { "<think>" };
            if let Some(at) = self.held.find(tag) {
                if self.inside { self.removed += at; } else { out.push_str(&self.held[..at]); }
                self.held.drain(..at + tag.len()); self.inside = !self.inside; continue;
            }
            // Keep back only what could still become the tag.
            let keep = (1..tag.len()).rev().find(|&n| self.held.len() >= n && self.held.is_char_boundary(self.held.len() - n) && tag.starts_with(&self.held[self.held.len() - n..])).unwrap_or(0);
            let cut = self.held.len() - keep;
            if self.inside { self.removed += cut; } else { out.push_str(&self.held[..cut]); }
            self.held.drain(..cut); return out;
        }
    }
    pub fn finish(&mut self) -> String { let rest = std::mem::take(&mut self.held); if self.inside { self.removed += rest.len(); String::new() } else { rest } }
}

/// One stream, either format: text, thinking, usage and the end of the reply.
pub struct EndpointParser { format: Format, pub text: String, pub model: String, filter: ThinkFilter, thinking_chars: usize, usage: Option<Value>,
    pub done: bool, pub events: usize, pub invalid_lines: usize, pub error: Option<String>, server_ms: Option<u64> }
impl EndpointParser {
    pub fn new(format: Format) -> Self { Self { format, text: String::new(), model: String::new(), filter: ThinkFilter::default(), thinking_chars: 0, usage: None,
        done: false, events: 0, invalid_lines: 0, error: None, server_ms: None } }
    /// Returns false for a line that is not an event (blank lines and SSE comments included).
    pub fn consume(&mut self, line: &str, on_event: &mut dyn FnMut(Streamed)) -> bool {
        let data = match self.format {
            Format::Ndjson => line.trim(),
            Format::Sse => match line.strip_prefix("data:") { Some(d) => d.trim(), None => return false },
        };
        if data.is_empty() { return false; }
        if self.format == Format::Sse && data == "[DONE]" { self.done = true; self.events += 1; return true; }
        let Ok(v) = serde_json::from_str::<Value>(data) else { self.invalid_lines += 1; return false };
        self.events += 1;
        if let Some(model) = v["model"].as_str() { if self.model.is_empty() { self.model = model.into(); } }
        if !v["error"].is_null() { self.error = Some(error_text(&v)); return true; }
        let (content, thinking) = match self.format {
            Format::Ndjson => (v["message"]["content"].as_str(), v["message"]["thinking"].as_str()),
            Format::Sse => { let d = &v["choices"][0]["delta"]; (d["content"].as_str(), d["reasoning"].as_str().or(d["reasoning_content"].as_str())) }
        };
        if let Some(t) = thinking { self.thinking_chars += t.len(); }
        if let Some(c) = content { let shown = self.filter.push(c); self.emit(&shown, on_event); }
        match self.format {
            Format::Ndjson => if v["done"] == true { self.done = true; self.server_ms = v["total_duration"].as_u64().map(|ns| ns / 1_000_000); self.usage = Some(v); },
            Format::Sse => { if !v["usage"].is_null() { self.usage = Some(v["usage"].clone()); } if v["choices"][0]["finish_reason"].is_string() { self.done = true; } }
        }
        true
    }
    fn emit(&mut self, text: &str, on_event: &mut dyn FnMut(Streamed)) { if !text.is_empty() { self.text.push_str(text); on_event(Streamed::Text(text)); } }
    /// CE-50: the server's figures, else `ceil(chars / 3)` estimates (CA-11) flagged as such.
    pub fn usage(&self, req: &Request) -> (Usage, bool) {
        let est = |chars: usize| chars.div_ceil(3) as u64;
        let thinking_est = est(self.thinking_chars + self.filter.removed);
        let u = self.usage.as_ref();
        let reported = match self.format {
            Format::Ndjson => u.and_then(|u| Some((u["prompt_eval_count"].as_u64()?, u["eval_count"].as_u64()?, u["prompt_eval_cached_count"].as_u64().unwrap_or(0), None))),
            Format::Sse => u.and_then(|u| Some((u["prompt_tokens"].as_u64()?, u["completion_tokens"].as_u64()?, u["prompt_tokens_details"]["cached_tokens"].as_u64().unwrap_or(0),
                u["completion_tokens_details"]["reasoning_tokens"].as_u64()))),
        };
        match reported {
            // Input as Claude reports it: the cached part goes to cacheRead. Output includes thinking (WG-31).
            Some((prompt, output, cached, thinking)) => (Usage { input: prompt.saturating_sub(cached), output, cache_read: cached, cache_write: 0,
                thinking: thinking.unwrap_or(thinking_est).min(output) }, false),
            None => (Usage { input: est(req.system.len() + req.prompt.len()), output: est(self.text.len()) + thinking_est, thinking: thinking_est, cache_read: 0, cache_write: 0 }, true),
        }
    }
}
fn error_text(v: &Value) -> String {
    let e = &v["error"];
    e.as_str().map(str::to_string).or_else(|| e["message"].as_str().map(str::to_string)).unwrap_or_else(|| e.to_string())
}

/// CE-40, CE-42: one place maps HTTP failures to the error vocabulary.
pub fn classify_http(status: u16, body: &str) -> ErrorKind {
    let t = body.to_lowercase();
    if is_context(&t) { return ErrorKind::ContextTooLong; }
    match status {
        401 | 403 => ErrorKind::KeyRejected,
        429 => ErrorKind::UsageLimit,
        404 if t.contains("model") => ErrorKind::ModelUnknown,
        404 => ErrorKind::Unreachable,
        400..=499 if t.contains("model") && ["not found", "does not exist", "unknown", "not available"].iter().any(|p| t.contains(p)) => ErrorKind::ModelUnknown,
        500..=599 => ErrorKind::ProcessCrashed,
        _ => ErrorKind::Protocol,
    }
}
/// An error reported inside a stream that has already started.
pub fn classify_stream_error(text: &str) -> ErrorKind {
    let t = text.to_lowercase();
    if is_context(&t) { ErrorKind::ContextTooLong } else if t.contains("model") && t.contains("not found") { ErrorKind::ModelUnknown } else { ErrorKind::Protocol }
}
fn is_context(t: &str) -> bool {
    (t.contains("context") && ["length", "exceed", "too long", "too large", "maximum", "window"].iter().any(|p| t.contains(p))) || t.contains("too many tokens")
}

enum Msg { Started, Line(String), Status(u16, String), Transport(ErrorKind, String), End(Option<String>) }
fn client() -> Result<Client, String> {
    // No total limit (IP-30): the stall clock below is the only one, and it starts at the first byte (CE-41).
    Client::builder().connect_timeout(Duration::from_secs(5)).timeout(None).build().map_err(|e| e.to_string())
}
fn transport(e: &reqwest::Error) -> (ErrorKind, String) {
    let kind = if e.is_connect() { ErrorKind::Unreachable } else { ErrorKind::Network };
    (kind, format!("{e}{}", std::error::Error::source(e).map(|s| format!(": {s}")).unwrap_or_default()))
}
fn read_capped(mut r: impl Read) -> String { let mut b = Vec::new(); let _ = r.by_ref().take(65536).read_to_end(&mut b); String::from_utf8_lossy(&b).into_owned() }

pub struct EndpointProvider { pub endpoint: Endpoint, pub stall_timeout: Duration }
impl EndpointProvider { pub fn new(endpoint: Endpoint) -> Self { Self { endpoint, stall_timeout: Duration::from_secs(120) } } }
/// CE-71, CE-72: the call's `Authorization` header, from the key stored for this endpoint, kept in `key` until the call ends.
fn auth(e: &Endpoint, url: &str, key: &mut Option<Zeroizing<String>>) -> Result<Option<HeaderValue>, (ErrorKind, String)> {
    let url = Url::parse(url).map_err(|err| (ErrorKind::Protocol, format!("Not a valid URL: {err}")))?;
    *key = keys::authorize(&e.id, &url)?;
    key.as_deref().map(|k| keys::bearer(k)).transpose().map_err(|d| (ErrorKind::Protocol, d))
}
impl InferenceProvider for EndpointProvider {
    /// CE-73: every error leaves through here, with the key and any `Authorization` value replaced by `[key]`.
    fn stream(&self, req: &Request, cancel: Cancel, on_event: &mut dyn FnMut(Streamed)) -> Result<Completion, ProviderError> {
        let mut key = None;
        let result = self.call(req, cancel, on_event, &mut key); let k = key.as_deref().map(String::as_str);
        result.map(|mut c| { c.model = keys::redact(&c.model, k); c })
            .map_err(|mut err| { err.details = keys::redact(&err.details, k); err.model = keys::redact(&err.model, k); err })
    }
}
impl EndpointProvider {
    fn call(&self, req: &Request, cancel: Cancel, on_event: &mut dyn FnMut(Streamed), key: &mut Option<Zeroizing<String>>) -> Result<Completion, ProviderError> {
        let start = Instant::now(); let e = &self.endpoint; let mut parser = EndpointParser::new(e.format());
        let fail = |kind, details: String, model: &str, usage: Usage| ProviderError { kind, details, model: model.into(), usage, duration_ms: start.elapsed().as_millis() as u64, tool_calls: None };
        let asked = req.model.clone().unwrap_or_default();
        let named = |model: &str| format!("{}:{}", e.id, if model.is_empty() { asked.as_str() } else { model });
        if cancel.load(Ordering::SeqCst) { return Err(fail(ErrorKind::Cancelled, String::new(), &named(""), Usage::default())); }
        // CE-13, CE-55: an endpoint call has no tools; web research runs on a CLI provider.
        if req.web { return Err(fail(ErrorKind::Protocol, "A web call cannot run on an endpoint".into(), &named(""), Usage::default())); }
        if asked.is_empty() { return Err(fail(ErrorKind::ModelUnknown, "No model given for this endpoint".into(), &named(""), Usage::default())); }
        check_url(e).map_err(|d| fail(ErrorKind::Protocol, d, &named(""), Usage::default()))?;
        let chat = e.chat_url(); let payload = body(e, req).to_string();
        let authorization = auth(e, &chat, key).map_err(|(k, d)| fail(k, d, &named(""), Usage::default()))?;
        let (tx, rx) = mpsc::sync_channel::<Msg>(256);
        // The reader owns the connection; once this call returns, its next send fails and dropping the response closes it (CE-11).
        let reader = std::thread::spawn(move || {
            let client = match client() { Ok(c) => c, Err(d) => { let _ = tx.send(Msg::Transport(ErrorKind::Protocol, d)); return; } };
            let mut post = client.post(&chat).header("Content-Type", "application/json").body(payload);
            if let Some(value) = authorization { post = post.header(AUTHORIZATION, value); }
            let response = match post.send() {
                Ok(r) => r, Err(err) => { let (k, d) = transport(&err); let _ = tx.send(Msg::Transport(k, d)); return; } };
            let status = response.status().as_u16();
            if !(200..300).contains(&status) {
                let retry = response.headers().get("retry-after").and_then(|v| v.to_str().ok()).map(|s| format!(" (retry after {s})")).unwrap_or_default();
                let _ = tx.send(Msg::Status(status, read_capped(response) + &retry)); return;
            }
            if tx.send(Msg::Started).is_err() { return; }
            for line in BufReader::new(response).lines() {
                match line { Ok(l) => if tx.send(Msg::Line(l)).is_err() { return; }, Err(err) => { let _ = tx.send(Msg::End(Some(err.to_string()))); return; } }
            }
            let _ = tx.send(Msg::End(None));
        });
        let mut last_event: Option<Instant> = None; let mut failure: Option<(ErrorKind, String)> = None;
        loop {
            if cancel.load(Ordering::SeqCst) { failure = Some((ErrorKind::Cancelled, String::new())); break; }
            if last_event.is_some_and(|t| t.elapsed() >= self.stall_timeout) { failure = Some((ErrorKind::Protocol, format!("Stream stalled for {} seconds", self.stall_timeout.as_secs()))); break; }
            match rx.recv_timeout(Duration::from_millis(25)) {
                // CE-41: headers can come before the model has loaded; the stall clock starts with the first line of the body.
                Ok(Msg::Started) => continue,
                Ok(Msg::Line(l)) => { last_event = Some(Instant::now()); parser.consume(&l, on_event);
                    if let Some(text) = parser.error.clone() { failure = Some((classify_stream_error(&text), text)); break; } }
                Ok(Msg::Status(code, text)) => { failure = Some((classify_http(code, &text), format!("HTTP {code}: {text}"))); break; }
                Ok(Msg::Transport(kind, text)) => { failure = Some((kind, text)); break; }
                Ok(Msg::End(err)) => { if let Some(err) = err { failure = Some((ErrorKind::Protocol, err)); } break; }
                Err(mpsc::RecvTimeoutError::Timeout) => continue,
                Err(mpsc::RecvTimeoutError::Disconnected) => { failure = Some((ErrorKind::Protocol, "The connection ended without a reply".into())); break; }
            }
        }
        drop(rx); let model = named(&parser.model);
        if let Some((kind, details)) = failure {
            // A cancelled or stalled reader may still be blocked on the socket: it is left to end on its own, never joined.
            drop(reader);
            return Err(fail(kind, details, &model, if parser.events > 0 { parser.usage(req).0 } else { Usage::default() }));
        }
        let _ = reader.join();
        let rest = parser.filter.finish(); parser.emit(&rest, on_event);
        let (usage, estimated) = parser.usage(req);
        if !parser.done { return Err(fail(ErrorKind::Protocol, format!("The stream ended before the reply was complete; {} events, {} unreadable lines", parser.events, parser.invalid_lines), &model, usage)); }
        Ok(Completion { text: parser.text.clone(), model, usage, duration_ms: parser.server_ms.unwrap_or(start.elapsed().as_millis() as u64), cost_usd: None, tool_calls: None,
            outcome: "ok".into(), resolved_effort: None, usage_estimated: estimated.then_some(true) })
    }
}

/// CE-21: the model ids the server lists at `GET /v1/models`.
pub fn models(e: &Endpoint) -> Result<Vec<String>, (ErrorKind, String)> {
    let v = get_json(e, &format!("{}/models", e.base()), None)?;
    Ok(v["data"].as_array().into_iter().flatten().filter_map(|m| m["id"].as_str().map(String::from)).collect())
}
/// CE-30: a model's context size and whether it can think, where the server says (Ollama `/api/show`, llama.cpp `/props`).
#[derive(Debug, Default, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo { pub context_size: Option<u64>, pub thinking: Option<bool> }
pub fn model_info(e: &Endpoint, model: &str) -> Result<ModelInfo, (ErrorKind, String)> {
    match e.preset.as_str() {
        "ollama" => Ok(parse_show(&get_json(e, &format!("{}/api/show", e.root()), Some(json!({"model": model})))?)),
        "llamacpp" => Ok(parse_props(&get_json(e, &format!("{}/props", e.root()), None)?)),
        _ => Ok(ModelInfo::default()),
    }
}
pub fn parse_show(v: &Value) -> ModelInfo {
    let context_size = v["model_info"].as_object().and_then(|m| m.iter().find(|(k, _)| k.ends_with(".context_length")).and_then(|(_, n)| n.as_u64()));
    let thinking = v["capabilities"].as_array().map(|c| c.iter().any(|x| x == "thinking"));
    ModelInfo { context_size, thinking }
}
/// From llama-server's documentation, not yet a recording: `n_ctx` under `default_generation_settings`, or at the top level.
pub fn parse_props(v: &Value) -> ModelInfo {
    ModelInfo { context_size: v["default_generation_settings"]["n_ctx"].as_u64().or(v["n_ctx"].as_u64()), thinking: None }
}
/// CE-73: as the stream, every error is redacted on the way out.
fn get_json(e: &Endpoint, url: &str, post: Option<Value>) -> Result<Value, (ErrorKind, String)> {
    let mut key = None;
    let result = fetch_json(e, url, post, &mut key);
    result.map_err(|(kind, d)| (kind, keys::redact(&d, key.as_deref().map(String::as_str))))
}
fn fetch_json(e: &Endpoint, url: &str, post: Option<Value>, key: &mut Option<Zeroizing<String>>) -> Result<Value, (ErrorKind, String)> {
    check_url(e).map_err(|d| (ErrorKind::Protocol, d))?;
    let authorization = auth(e, url, key)?;
    let client = Client::builder().connect_timeout(Duration::from_secs(5)).timeout(Duration::from_secs(20)).build().map_err(|err| (ErrorKind::Protocol, err.to_string()))?;
    let request = match post { Some(b) => client.post(url).header("Content-Type", "application/json").body(b.to_string()), None => client.get(url) };
    let request = match authorization { Some(value) => request.header(AUTHORIZATION, value), None => request };
    let response = request.send().map_err(|err| transport(&err))?;
    let status = response.status().as_u16(); let text = read_capped(response);
    if !(200..300).contains(&status) { return Err((classify_http(status, &text), format!("HTTP {status}: {text}"))); }
    serde_json::from_str(&text).map_err(|err| (ErrorKind::Protocol, format!("Not JSON: {err}")))
}

#[cfg(test)] #[path = "endpoint_tests.rs"] mod tests;
