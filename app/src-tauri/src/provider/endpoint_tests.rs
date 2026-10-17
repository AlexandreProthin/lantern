use super::*;
use std::{io::Write, net::TcpListener, sync::{atomic::AtomicBool, Arc}};

fn fixture(name: &str) -> String { std::fs::read_to_string(format!("{}/fixtures/endpoint/{name}.body", env!("CARGO_MANIFEST_DIR"))).unwrap() }
fn ollama() -> Endpoint { Endpoint { id: "ollama".into(), preset: "ollama".into(), base_url: "http://localhost:11434/v1".into(), context_size: Some(8192), thinking: None, lan_confirmed: false } }
fn compat(base: &str) -> Endpoint { Endpoint { id: "local".into(), preset: "custom".into(), base_url: base.into(), context_size: None, thinking: None, lan_confirmed: false } }
fn request() -> Request { Request { request_id: "t".into(), system: "Be terse.".into(), prompt: "Say Lantern ready.".into(), model: Some("gemma4:e2b".into()), effort: Some("medium".into()), web: false } }
/// Feeds a recorded body line by line, as the reader does, and returns the parser with what the caller saw.
fn replay(format: Format, name: &str) -> (EndpointParser, String) {
    let mut p = EndpointParser::new(format); let mut seen = String::new();
    for line in fixture(name).lines() { p.consume(line, &mut |e| if let Streamed::Text(t) = e { seen.push_str(t) }); }
    let rest = p.filter.finish(); seen.push_str(&rest); p.text.push_str(&rest);
    (p, seen)
}

#[test]
fn native_reply_streams_text_and_reads_ollamas_usage() {
    let (p, seen) = replay(Format::Ndjson, "ollama-native-ok");
    assert!(p.done); assert_eq!(p.model, "gemma4:e2b"); assert_eq!(p.text, seen); assert!(seen.contains("<options>["));
    let (u, estimated) = p.usage(&request());
    assert!(!estimated); assert_eq!((u.input, u.output, u.cache_read, u.thinking), (91, 264, 0, 0));
}
#[test]
fn native_thinking_never_reaches_the_text_and_counts_as_thinking() {
    for name in ["ollama-native-thinking", "ollama-native-think-default"] {
        let (p, seen) = replay(Format::Ndjson, name);
        assert_eq!(p.text, seen); assert!(seen.trim_end().ends_with("</options>"), "{name}");
        let (u, _) = p.usage(&request()); assert!(u.thinking > 100 && u.thinking <= u.output, "{name}: {u:?}");
    }
    // The cached part of the prompt goes to cacheRead, as Claude reports it.
    let (p, _) = replay(Format::Ndjson, "ollama-native-think-default"); let (u, _) = p.usage(&request());
    assert_eq!((u.input, u.cache_read), (5, 88));
}
#[test]
fn compatible_reply_reads_sse_usage_and_drops_reasoning() {
    let (p, seen) = replay(Format::Sse, "ollama-compat-ok");
    assert!(p.done); assert_eq!(p.text, seen); assert!(seen.ends_with("</options>"));
    let (u, estimated) = p.usage(&request()); assert!(!estimated); assert_eq!((u.input, u.output), (91, 257));
    let (p, seen) = replay(Format::Sse, "ollama-compat-think-default");
    assert!(!seen.to_lowercase().starts_with("thinking")); let (u, _) = p.usage(&request()); assert!(u.thinking > 100, "{u:?}");
}
#[test]
fn missing_usage_is_estimated_and_flagged() {
    let (p, _) = replay(Format::Sse, "ollama-compat-no-usage");
    let (u, estimated) = p.usage(&request()); assert!(estimated); assert_eq!(u.output, (p.text.len() as u64).div_ceil(3)); assert!(u.input > 0);
}
#[test]
fn inline_think_tags_are_removed_across_chunk_boundaries() {
    let mut f = ThinkFilter::default(); let mut out = String::new();
    for chunk in ["Hello <th", "ink>hidden ", "plan</thi", "nk> world <", "b>bold</b> é<", "options>"] { out.push_str(&f.push(chunk)); }
    out.push_str(&f.finish());
    assert_eq!(out, "Hello  world <b>bold</b> é<options>"); assert_eq!(f.removed, "hidden plan".len());
    let mut f = ThinkFilter::default(); assert_eq!(f.push("<think>never closed"), ""); assert_eq!(f.finish(), "");
}
#[test]
fn request_bodies_carry_size_thinking_and_no_tools() {
    let mut e = ollama(); let b = body(&e, &request());
    assert_eq!(e.chat_url(), "http://localhost:11434/api/chat");
    assert_eq!(b["think"], false); assert_eq!(b["options"]["num_ctx"], 8192); assert_eq!(b["messages"][0]["role"], "system"); assert_eq!(b["messages"][1]["content"], "Say Lantern ready.");
    e.thinking = Some("on".into()); assert_eq!(body(&e, &request())["think"], true);
    e.thinking = Some("default".into()); assert!(body(&e, &request()).get("think").is_none());
    let c = compat("http://127.0.0.1:8080/v1/"); let b = body(&c, &request());
    assert_eq!(c.chat_url(), "http://127.0.0.1:8080/v1/chat/completions");
    assert_eq!(b["stream_options"]["include_usage"], true); assert_eq!(b["reasoning_effort"], "none"); assert!(b.get("options").is_none());
    for b in [body(&ollama(), &request()), b] { assert!(b.get("tools").is_none() && b.get("tool_choice").is_none()); }
}
#[test]
fn recorded_errors_and_http_statuses_map_to_the_vocabulary() {
    let kind = |s, b: &str| format!("{:?}", classify_http(s, b));
    assert_eq!(kind(404, &fixture("ollama-native-model-missing")), "ModelUnknown");
    assert_eq!(kind(404, &fixture("ollama-compat-model-missing")), "ModelUnknown");
    assert_eq!(kind(400, &fixture("ollama-native-bad-request")), "Protocol");
    assert_eq!(kind(404, "404 page not found"), "Unreachable");
    assert_eq!(kind(401, "{}"), "KeyRejected"); assert_eq!(kind(403, "forbidden"), "KeyRejected");
    assert_eq!(kind(429, "slow down (retry after 20)"), "UsageLimit");
    assert_eq!(kind(400, "the request exceeds the available context size"), "ContextTooLong");
    assert_eq!(kind(503, "loading"), "ProcessCrashed");
    let mut p = EndpointParser::new(Format::Ndjson);
    p.consume(r#"{"error":"model requires more system memory than is available"}"#, &mut |_| {}); assert!(p.error.is_some());
    assert_eq!(format!("{:?}", classify_stream_error("prompt is too long for the context window")), "ContextTooLong");
}
#[test]
fn model_lists_and_context_sizes_from_the_recordings() {
    let v: Value = serde_json::from_str(&fixture("ollama-compat-models")).unwrap();
    assert_eq!(v["data"][0]["id"], "gemma4:e2b");
    let show: Value = serde_json::from_str(&fixture("ollama-native-show")).unwrap();
    assert_eq!(parse_show(&show), ModelInfo { context_size: Some(131072), thinking: Some(true) });
    assert_eq!(parse_props(&json!({"default_generation_settings": {"n_ctx": 4096}})).context_size, Some(4096));
    assert_eq!(parse_props(&json!({"n_ctx": 8192})).context_size, Some(8192));
}
#[test]
fn http_is_only_for_this_machine_or_a_confirmed_lan_address() {
    let ok = |url: &str, lan: bool| { let mut e = compat(url); e.lan_confirmed = lan; check_url(&e).is_ok() };
    for url in ["http://localhost:11434/v1", "http://127.0.0.1:8080/v1", "http://[::1]:1234/v1", "https://integrate.api.nvidia.com/v1", "https://192.168.1.20/v1"] { assert!(ok(url, false), "{url}"); }
    for url in ["http://192.168.1.20:11434/v1", "http://gpu-box:11434", "http://example.com/v1", "ftp://localhost/v1", "http://user:pw@localhost/v1", "not a url"] { assert!(!ok(url, false), "{url}"); }
    for url in ["http://192.168.1.20:11434/v1", "http://10.0.0.5/v1", "http://gpu-box:11434", "http://gpu.local/v1", "http://[fd00::5]/v1"] { assert!(ok(url, true), "{url}"); }
    for url in ["http://example.com/v1", "http://8.8.8.8/v1"] { assert!(!ok(url, true), "a confirmed LAN flag does not open {url}"); }
}

/// A one-shot HTTP server: answers the first request with `head`, then writes `chunks` with the given pauses.
fn serve(head: &'static str, chunks: Vec<(u64, String)>) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap(); let addr = listener.local_addr().unwrap();
    std::thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap(); let mut buf = [0u8; 65536]; let _ = s.read(&mut buf);
        let _ = s.write_all(head.as_bytes());
        for (pause, chunk) in chunks { std::thread::sleep(Duration::from_millis(pause)); if s.write_all(chunk.as_bytes()).is_err() { return; } let _ = s.flush(); }
    });
    format!("http://{addr}")
}
const NDJSON: &str = "HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nConnection: close\r\n\r\n";
fn line(text: &str) -> String { format!("{}\n", json!({"model": "gemma4:e2b", "message": {"role": "assistant", "content": text}, "done": false})) }
fn done() -> String { format!("{}\n", json!({"model": "gemma4:e2b", "message": {"role": "assistant", "content": ""}, "done": true, "prompt_eval_count": 10, "eval_count": 3})) }
fn run(e: Endpoint, stall: Duration, cancel: Cancel) -> (Result<Completion, ProviderError>, String, Duration) {
    let p = EndpointProvider { endpoint: e, stall_timeout: stall }; let mut seen = String::new(); let start = Instant::now();
    let r = p.stream(&request(), cancel, &mut |ev| if let Streamed::Text(t) = ev { seen.push_str(t) }); (r, seen, start.elapsed())
}
fn native_at(base: String) -> Endpoint { Endpoint { base_url: base + "/v1", ..ollama() } }

#[test]
fn a_full_call_names_the_endpoint_in_the_model_and_needs_no_cli() {
    let base = serve(NDJSON, vec![(0, line("Lantern")), (10, line(" ready.")), (10, done())]);
    let (r, seen, _) = run(native_at(base), Duration::from_secs(5), Arc::new(AtomicBool::new(false)));
    let c = r.unwrap(); assert_eq!(c.text, "Lantern ready."); assert_eq!(seen, c.text);
    assert_eq!(c.model, "ollama:gemma4:e2b"); assert_eq!((c.usage.input, c.usage.output), (10, 3)); assert!(c.resolved_effort.is_none() && c.usage_estimated.is_none());
}
#[test]
fn a_slow_first_byte_is_not_a_stall_but_silence_after_it_is() {
    // CE-41: loading the model takes longer than the stall limit before the first line, and is fine, headers sent or not.
    let base = serve(NDJSON, vec![(600, line("late")), (0, done())]);
    let (r, _, _) = run(native_at(base), Duration::from_millis(300), Arc::new(AtomicBool::new(false)));
    assert_eq!(r.unwrap().text, "late");
    let base = serve(NDJSON, vec![(0, line("first")), (900, done())]);
    let (r, seen, _) = run(native_at(base), Duration::from_millis(300), Arc::new(AtomicBool::new(false)));
    let err = r.unwrap_err(); assert!(matches!(err.kind, ErrorKind::Protocol) && err.details.contains("stalled"), "{err:?}"); assert_eq!(seen, "first");
    let slow_head = "HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nConnection: close\r\n\r\n";
    let listener = TcpListener::bind("127.0.0.1:0").unwrap(); let addr = listener.local_addr().unwrap();
    std::thread::spawn(move || { let (mut s, _) = listener.accept().unwrap(); let mut b = [0u8; 65536]; let _ = s.read(&mut b);
        std::thread::sleep(Duration::from_millis(600)); let _ = s.write_all(slow_head.as_bytes()); let _ = s.write_all((line("ok") + &done()).as_bytes()); });
    let (r, _, _) = run(native_at(format!("http://{addr}")), Duration::from_millis(300), Arc::new(AtomicBool::new(false)));
    assert_eq!(r.unwrap().text, "ok");
}
#[test]
fn cancel_returns_at_once_mid_stream() {
    let base = serve(NDJSON, (0..200).map(|i| (50, line(&format!("w{i} ")))).collect());
    let cancel = Arc::new(AtomicBool::new(false)); let flag = cancel.clone();
    std::thread::spawn(move || { std::thread::sleep(Duration::from_millis(300)); flag.store(true, Ordering::SeqCst); });
    let (r, seen, took) = run(native_at(base), Duration::from_secs(5), cancel);
    let err = r.unwrap_err(); assert!(matches!(err.kind, ErrorKind::Cancelled)); assert!(!seen.is_empty()); assert!(took < Duration::from_secs(2), "{took:?}");
    assert_eq!(err.model, "ollama:gemma4:e2b");
}
#[test]
fn refused_connections_statuses_and_cut_streams_fail_typed() {
    let port = { let l = TcpListener::bind("127.0.0.1:0").unwrap(); l.local_addr().unwrap().port() };
    let (r, _, _) = run(native_at(format!("http://127.0.0.1:{port}")), Duration::from_secs(5), Arc::new(AtomicBool::new(false)));
    assert!(matches!(r.unwrap_err().kind, ErrorKind::Unreachable));
    let base = serve("HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: 46\r\nConnection: close\r\n\r\n{\"error\":\"model 'no-such-model:1b' not found\"}", vec![]);
    let err = run(native_at(base), Duration::from_secs(5), Arc::new(AtomicBool::new(false))).0.unwrap_err();
    assert!(matches!(err.kind, ErrorKind::ModelUnknown)); assert!(err.details.contains("not found"));
    let base = serve(NDJSON, vec![(0, line("half an ans"))]);
    let err = run(native_at(base), Duration::from_secs(5), Arc::new(AtomicBool::new(false))).0.unwrap_err();
    assert!(matches!(err.kind, ErrorKind::Protocol)); assert!(err.usage.output > 0, "known usage is kept");
    let mut web = request(); web.web = true;
    let p = EndpointProvider::new(ollama()); assert!(matches!(p.stream(&web, Arc::new(AtomicBool::new(false)), &mut |_| {}).unwrap_err().kind, ErrorKind::Protocol));
    let p = EndpointProvider::new(compat("http://example.com/v1")); assert!(matches!(p.stream(&request(), Arc::new(AtomicBool::new(false)), &mut |_| {}).unwrap_err().kind, ErrorKind::Protocol));
}
#[test]
#[ignore = "Calls the user's Ollama at localhost:11434 with gemma4:e2b"]
fn real_ollama_stream_models_and_info() {
    let e = ollama(); assert!(models(&e).unwrap().iter().any(|m| m == "gemma4:e2b"));
    assert_eq!(model_info(&e, "gemma4:e2b").unwrap().context_size, Some(131072));
    let mut req = request(); req.prompt = "Reply with exactly: Lantern ready.".into();
    let mut seen = String::new(); let c = EndpointProvider::new(e).stream(&req, Arc::new(AtomicBool::new(false)), &mut |ev| if let Streamed::Text(t) = ev { seen.push_str(t) }).unwrap();
    assert_eq!(c.text, seen); assert!(c.text.contains("Lantern")); assert_eq!(c.model, "ollama:gemma4:e2b"); assert!(c.usage.output > 0);
}
