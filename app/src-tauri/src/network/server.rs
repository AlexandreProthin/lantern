//! NW-2, NW-4, NW-12, NW-20..24, NW-30: HTTPS on the LAN, routing to the same functions the Tauri commands call.
use super::{devices::Registry, rights};
use crate::{commands::{self, StorageLock}, provider::{self, commands::Calls, endpoint::Endpoint, Request}};
use bytes::Bytes;
use http_body_util::{combinators::BoxBody, BodyExt, Full, Limited, StreamBody};
use hyper::{body::{Frame, Incoming}, header, Method, Response, StatusCode};
use hyper_util::rt::TokioIo;
use serde_json::{json, Value};
use std::{collections::HashSet, convert::Infallible, net::SocketAddr, sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex}, time::Duration};
use tauri::{AppHandle, Manager};
use tokio::sync::{mpsc, watch};

type Body = BoxBody<Bytes, Infallible>;
const COOKIE: &str = "lantern_device";
/// Subjects travel whole; the largest seen are a few megabytes.
const MAX_BODY: usize = 32 * 1024 * 1024;
const CSP: &str = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'";

pub struct Shared { pub app: AppHandle, pub registry: Arc<Registry>, pub calls: Mutex<HashSet<String>> }
impl Shared {
    /// NW-5: the remote generations still running are cancelled when the server stops.
    pub fn cancel_all(&self) {
        let ids: Vec<String> = self.calls.lock().map(|c| c.iter().cloned().collect()).unwrap_or_default();
        for id in ids { provider::commands::cancel_generation(id, self.app.state::<Calls>()); }
    }
}

pub async fn serve(listener: std::net::TcpListener, tls: Arc<rustls::ServerConfig>, shared: Arc<Shared>, mut stop: watch::Receiver<bool>) {
    let Ok(listener) = tokio::net::TcpListener::from_std(listener) else { return };
    let acceptor = tokio_rustls::TlsAcceptor::from(tls);
    loop {
        let (tcp, peer) = tokio::select! {
            accepted = listener.accept() => match accepted { Ok(a) => a, Err(_) => { tokio::time::sleep(Duration::from_millis(50)).await; continue; } },
            _ = stop.changed() => break,
        };
        // NW-2: closed before TLS when the peer is not on a private network.
        if !rights::peer_allowed(peer.ip()) { drop(tcp); continue; }
        let (acceptor, shared, mut stop) = (acceptor.clone(), shared.clone(), stop.clone());
        tokio::spawn(async move {
            let Ok(Ok(stream)) = tokio::time::timeout(Duration::from_secs(10), acceptor.accept(tcp)).await else { return };
            let service = hyper::service::service_fn(move |req| { let shared = shared.clone(); async move { Ok::<_, Infallible>(route(shared, peer, req).await) } });
            let conn = hyper::server::conn::http1::Builder::new().serve_connection(TokioIo::new(stream), service);
            tokio::select! { _ = conn => {}, _ = stop.changed() => {} }
        });
    }
}

fn full(status: StatusCode, content_type: &str, bytes: impl Into<Bytes>) -> Response<Body> {
    let mut r = Response::new(Full::new(bytes.into()).boxed());
    *r.status_mut() = status;
    let h = r.headers_mut();
    h.insert(header::CONTENT_TYPE, content_type.parse().unwrap());
    h.insert(header::X_CONTENT_TYPE_OPTIONS, "nosniff".parse().unwrap());
    h.insert(header::REFERRER_POLICY, "no-referrer".parse().unwrap());
    h.insert(header::CONTENT_SECURITY_POLICY, CSP.parse().unwrap());
    r
}
fn json_response(status: StatusCode, value: &Value) -> Response<Body> {
    let mut r = full(status, "application/json", serde_json::to_vec(value).unwrap_or_default());
    r.headers_mut().insert(header::CACHE_CONTROL, "no-store".parse().unwrap()); r
}

fn cookie(req: &hyper::Request<Incoming>) -> Option<String> {
    req.headers().get_all(header::COOKIE).iter().filter_map(|v| v.to_str().ok()).flat_map(|v| v.split(';'))
        .filter_map(|p| p.trim().strip_prefix(COOKIE).and_then(|r| r.strip_prefix('='))).map(String::from).next()
}
/// A cross-site page cannot call the API: an `Origin`, when sent, must name this server.
fn same_origin(req: &hyper::Request<Incoming>) -> bool {
    let Some(origin) = req.headers().get(header::ORIGIN).and_then(|v| v.to_str().ok()) else { return true };
    let host = req.headers().get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("");
    origin.strip_prefix("https://") == Some(host)
}
async fn read_json(body: Incoming) -> Result<Value, Response<Body>> {
    let bytes = Limited::new(body, MAX_BODY).collect().await.map_err(|_| json_response(StatusCode::PAYLOAD_TOO_LARGE, &json!("Request too large")))?.to_bytes();
    if bytes.is_empty() { return Ok(json!({})); }
    serde_json::from_slice(&bytes).map_err(|e| json_response(StatusCode::BAD_REQUEST, &json!(e.to_string())))
}

async fn route(shared: Arc<Shared>, peer: SocketAddr, req: hyper::Request<Incoming>) -> Response<Body> {
    let path = req.uri().path().to_string();
    if !path.starts_with("/api/") {
        return if req.method() == Method::GET || req.method() == Method::HEAD { asset(&shared.app, &path) } else { json_response(StatusCode::METHOD_NOT_ALLOWED, &json!("Method not allowed")) };
    }
    let paired = cookie(&req).is_some_and(|t| shared.registry.check(&t));
    if path == "/api/session" { return json_response(StatusCode::OK, &json!({"paired":paired})); }
    if req.method() != Method::POST || !same_origin(&req) { return json_response(StatusCode::FORBIDDEN, &json!("Refused")); }
    if path == "/api/pair" {
        let agent = req.headers().get(header::USER_AGENT).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
        let body = match read_json(req.into_body()).await { Ok(b) => b, Err(r) => return r };
        return match shared.registry.pair(peer.ip(), body["code"].as_str().unwrap_or(""), &agent) {
            Ok(token) => {
                let mut r = json_response(StatusCode::OK, &json!({"paired":true}));
                r.headers_mut().insert(header::SET_COOKIE, format!("{COOKIE}={token}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict").parse().unwrap()); r
            }
            Err(e) => json_response(StatusCode::FORBIDDEN, &json!(e)),
        };
    }
    // NW-12, NW-32: the page shows its pairing screen on a 401.
    if !paired { return json_response(StatusCode::UNAUTHORIZED, &json!({"unpaired":true})); }
    let body = match read_json(req.into_body()).await { Ok(b) => b, Err(r) => return r };
    if path == "/api/generate" { return generate(shared, body).await; }
    let Some(command) = path.strip_prefix("/api/invoke/") else { return json_response(StatusCode::NOT_FOUND, &json!("Not found")) };
    if !rights::allowed(command) { return json_response(StatusCode::FORBIDDEN, &json!("Only on the desktop app")); }
    match invoke(&shared.app, command, body).await {
        Ok(v) => json_response(StatusCode::OK, &v),
        Err(e) => json_response(StatusCode::BAD_REQUEST, &e),
    }
}

/// The settings document on disk, `{}` when there is none yet.
pub fn stored_settings(app: &AppHandle) -> Value {
    commands::config(app).ok().and_then(|c| std::fs::read(c.join("settings.json")).ok()).and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_else(|| json!({}))
}
fn library(app: &AppHandle, settings: &Value) -> String {
    rights::library_of(settings, &commands::default_library(app.clone()).map(|p| p.to_string_lossy().into_owned()).unwrap_or_default())
}
fn arg<T: serde::de::DeserializeOwned>(args: &Value, name: &str) -> Result<T, Value> {
    serde_json::from_value(args.get(name).cloned().unwrap_or(Value::Null)).map_err(|e| json!(format!("Argument {name}: {e}")))
}
fn to<T: serde::Serialize, E: serde::Serialize>(r: Result<T, E>) -> Result<Value, Value> {
    match r { Ok(v) => serde_json::to_value(v).map_err(|e| json!(e.to_string())), Err(e) => Err(serde_json::to_value(e).unwrap_or(Value::Null)) }
}

/// NW-20..24: an allowed command, with the library and endpoints taken from the desktop's settings.
pub async fn invoke(app: &AppHandle, command: &str, mut args: Value) -> Result<Value, Value> {
    let settings = stored_settings(app);
    rights::override_library(&mut args, &library(app, &settings));
    let endpoint = |args: &Value| -> Result<Endpoint, Value> { let e: Endpoint = arg(args, "endpoint")?; rights::check_endpoint(&e, &settings).map_err(|e| json!(e))?; Ok(e) };
    match command {
        "provider_status" => to(provider::commands::provider_status(app.state()).await),
        "endpoint_models" => to(provider::commands::endpoint_models(endpoint(&args)?).await),
        "endpoint_model_info" => to(provider::commands::endpoint_model_info(endpoint(&args)?, arg(&args, "model")?).await),
        "endpoint_key_status" => to(provider::commands::endpoint_key_status(arg(&args, "endpointId")?).await),
        "cancel_generation" => { provider::commands::cancel_generation(arg(&args, "requestId")?, app.state()); Ok(Value::Null) }
        "import_poc" => Ok(json!([])),
        _ => {
            let (app, command) = (app.clone(), command.to_string());
            tauri::async_runtime::spawn_blocking(move || blocking(&app, &command, args, settings)).await.map_err(|e| json!(e.to_string()))?
        }
    }
}
fn blocking(app: &AppHandle, command: &str, args: Value, settings: Value) -> Result<Value, Value> {
    let lock = || app.state::<StorageLock>();
    match command {
        "default_library" => to(commands::default_library(app.clone())),
        "load_settings" => to(commands::load_settings(app.clone(), lock())),
        "save_settings" => {
            if !settings.is_object() || settings.get("format").is_none() { return Err(json!("Open Lantern on the desktop first")); }
            let document = rights::merge_settings(arg(&args, "document")?, &settings).map_err(|e| json!(e))?;
            to(commands::save_settings(app.clone(), document, lock()))
        }
        "load_subject" => to(commands::load_subject(arg(&args, "library")?, arg(&args, "id")?, lock())),
        "save_subject" => to(commands::save_subject(arg(&args, "library")?, arg(&args, "subject")?, arg(&args, "expected")?, arg(&args, "dirty")?, lock())),
        "list_subjects" => to(commands::list_subjects(app.clone(), arg(&args, "library")?, lock())),
        "record_open" => to(commands::record_open(app.clone(), arg(&args, "id")?, arg(&args, "at")?, lock())),
        "read_state" => to(commands::read_state(app.clone(), lock())),
        "save_companion_state" => to(commands::save_companion_state(app.clone(), arg(&args, "companion")?, lock())),
        "append_amber_log" => to(commands::append_amber_log(app.clone(), arg(&args, "record")?, lock())),
        "amber_log_totals" => to(commands::amber_log_totals(app.clone(), lock())),
        "delete_subject" => to(commands::delete_subject(app.clone(), arg(&args, "library")?, arg(&args, "id")?, lock())),
        "subject_thumbnail" => to(commands::subject_thumbnail(arg(&args, "library")?, arg(&args, "id")?, arg(&args, "room")?, lock())),
        _ => Err(json!("Only on the desktop app")),
    }
}

/// NW-30: NDJSON lines, `{"chunk":…}` while the call runs, then one `{"result":…}` or `{"error":…}`.
/// A dropped connection cancels the call.
async fn generate(shared: Arc<Shared>, body: Value) -> Response<Body> {
    let request: Request = match arg(&body, "request") { Ok(r) => r, Err(e) => return json_response(StatusCode::BAD_REQUEST, &e) };
    let endpoint: Option<Endpoint> = match arg(&body, "endpoint") { Ok(e) => e, Err(e) => return json_response(StatusCode::BAD_REQUEST, &e) };
    if let Some(e) = &endpoint { if let Err(e) = rights::check_endpoint(e, &stored_settings(&shared.app)) { return json_response(StatusCode::BAD_REQUEST, &json!({"kind":"protocol","details":e,"model":"","usage":{"input":0,"output":0,"thinking":0,"cacheRead":0,"cacheWrite":0},"durationMs":0})); } }
    let id = request.request_id.clone();
    if let Ok(mut calls) = shared.calls.lock() { calls.insert(id.clone()); }
    let (tx, rx) = mpsc::unbounded_channel::<(Bytes, bool)>();
    let done = Arc::new(AtomicBool::new(false));
    let line = |v: Value| { let mut b = serde_json::to_vec(&v).unwrap_or_default(); b.push(b'\n'); Bytes::from(b) };
    {
        let (tx, done, shared, id) = (tx.clone(), done.clone(), shared.clone(), id.clone());
        tokio::spawn(async move { tx.closed().await; if !done.load(Ordering::SeqCst) { provider::commands::cancel_generation(id, shared.app.state::<Calls>()); } });
    }
    tokio::spawn(async move {
        let chunks = tx.clone();
        let result = provider::commands::run(request, endpoint, &shared.app.state::<Calls>(), move |chunk| { let _ = chunks.send((line(json!({"chunk":chunk})), false)); }).await;
        done.store(true, Ordering::SeqCst);
        if let Ok(mut calls) = shared.calls.lock() { calls.remove(&id); }
        let _ = tx.send((line(match result { Ok(c) => json!({"result":c}), Err(e) => json!({"error":e}) }), true));
    });
    let stream = futures_util::stream::unfold((rx, false), |(mut rx, finished)| async move {
        if finished { return None; }
        let (bytes, last) = rx.recv().await?;
        Some((Ok::<_, Infallible>(Frame::data(bytes)), (rx, last)))
    });
    let mut r = Response::new(StreamBody::new(stream).boxed());
    let h = r.headers_mut();
    h.insert(header::CONTENT_TYPE, "application/x-ndjson".parse().unwrap());
    h.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    h.insert(header::X_CONTENT_TYPE_OPTIONS, "nosniff".parse().unwrap());
    r
}

fn mime(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8", "js" | "mjs" => "text/javascript; charset=utf-8", "css" => "text/css; charset=utf-8",
        "json" => "application/json", "svg" => "image/svg+xml", "png" => "image/png", "ico" => "image/x-icon", "webp" => "image/webp",
        "woff2" => "font/woff2", "woff" => "font/woff", "ttf" => "font/ttf", "txt" => "text/plain; charset=utf-8", "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}
fn load_asset(app: &AppHandle, path: &str) -> Option<(Vec<u8>, String)> {
    if let Some(a) = app.asset_resolver().get(path.to_string()) { return Some((a.bytes, a.mime_type)); }
    // A debug build serves the frontend from Vite's dev server, so nothing is embedded: read `dist/`.
    #[cfg(debug_assertions)] {
        let relative = path.trim_start_matches('/');
        if relative.split('/').any(|p| p == ".." || p.contains('\\') || p.contains(':')) { return None; }
        let file = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../dist").join(relative);
        if let Ok(bytes) = std::fs::read(&file) { return Some((bytes, mime(path).into())); }
    }
    None
}
/// NW-4, NW-30: the page learns it is served by Lantern from a meta tag; Tauri's own CSP is dropped for the server's.
pub fn mark_index(html: &str) -> String {
    let mut out = html.to_string();
    while let Some(start) = out.find("<meta http-equiv=\"Content-Security-Policy\"") {
        let Some(len) = out[start..].find('>') else { break }; out.replace_range(start..start + len + 1, "");
    }
    match out.find("<head>") { Some(i) => { out.insert_str(i + 6, "<meta name=\"lantern-remote\" content=\"1\">"); out } None => out }
}
fn asset(app: &AppHandle, path: &str) -> Response<Body> {
    let path = if path == "/" { "/index.html" } else { path };
    let found = load_asset(app, path).or_else(|| if path.rsplit('/').next().is_some_and(|f| !f.contains('.')) { load_asset(app, "/index.html") } else { None });
    let Some((bytes, kind)) = found else { return full(StatusCode::NOT_FOUND, "text/plain; charset=utf-8", "Not found") };
    let kind = if kind.is_empty() || kind == "application/octet-stream" { mime(path).to_string() } else { kind };
    if kind.starts_with("text/html") {
        let mut r = full(StatusCode::OK, "text/html; charset=utf-8", mark_index(&String::from_utf8_lossy(&bytes)));
        r.headers_mut().insert(header::CACHE_CONTROL, "no-store".parse().unwrap()); return r;
    }
    full(StatusCode::OK, &kind, bytes)
}
