use super::*;
fn parse(fixture: &str) -> (StreamParser, String) {
    let mut parser = StreamParser::default(); let mut chunks = String::new();
    for line in fixture.lines() { parser.consume(line, &mut |t| chunks.push_str(t)); }
    (parser, chunks)
}
#[test]
fn recorded_success_resolves_model_reports_usage_and_preserves_chunk_order() {
    let (parser, chunks) = parse(include_str!("../../fixtures/provider/recorded-ok.jsonl"));
    let mut fallback = String::new(); let result = parser.finish(true, String::new(), Some("low".into()), Duration::ZERO, &mut |t| fallback.push_str(t)).unwrap();
    assert_eq!(result.text, chunks); assert!(fallback.is_empty());
    assert_eq!(result.model, "claude-haiku-4-5-20251001"); assert_eq!(result.usage.input, 406);
    assert_eq!(result.usage.output, 45); assert_eq!(result.usage.thinking, 34); assert_eq!(result.duration_ms, 1300);
}
#[test]
fn no_delta_fallback_and_result_errors_even_with_exit_zero() {
    let raw = include_str!("../../fixtures/provider/recorded-ok.jsonl");
    let no_delta = raw.lines().filter(|l| !l.contains("text_delta")).collect::<Vec<_>>().join("\n");
    let (parser, chunks) = parse(&no_delta); assert!(chunks.is_empty()); let mut emitted = String::new();
    let result = parser.finish(true, String::new(), None, Duration::ZERO, &mut |t| emitted.push_str(t)).unwrap(); assert_eq!(result.text, emitted); assert!(!emitted.is_empty());
    for (text, kind) in [("Please /login", ErrorKind::NotLoggedIn), ("Usage limit reached", ErrorKind::UsageLimit), ("Unknown model", ErrorKind::ModelUnknown), ("fetch failed", ErrorKind::Network), ("Unexpected failure", ErrorKind::ProcessCrashed)] {
        let mut parser = StreamParser::default(); parser.consume(&serde_json::json!({"type":"result", "is_error":true,"result":text,"usage":{"input_tokens":20},"duration_ms":10}).to_string(), &mut |_| {});
        let err = parser.finish(true, String::new(), None, Duration::ZERO, &mut |_| {}).unwrap_err();
        assert_eq!(std::mem::discriminant(&err.kind), std::mem::discriminant(&kind)); assert_eq!(err.usage.input, 20); assert_eq!(err.duration_ms, 10);
    }
}
#[test]
fn recorded_unknown_model_wording_is_classified() {
    let (parser, _) = parse(include_str!("../../fixtures/provider/recorded-model-unknown.jsonl"));
    assert!(matches!(parser.finish(false, String::new(), None, Duration::ZERO, &mut |_| {}).unwrap_err().kind, ErrorKind::ModelUnknown));
}
#[test]
fn truncated_malformed_and_cancelled_streams_preserve_known_metadata() {
    let (parser, _) = parse("bad json\n{\"type\":\"system\",\"subtype\":\"init\",\"model\":\"resolved\"}");
    assert_eq!(parser.invalid_lines, 1); let err = parser.error(ErrorKind::Cancelled, String::new(), Duration::from_millis(42));
    assert_eq!(err.model, "resolved"); assert_eq!(err.usage.output, 0); assert_eq!(err.duration_ms, 42);
    assert!(matches!(parser.finish(true, String::new(), None, Duration::ZERO, &mut |_| {}).unwrap_err().kind, ErrorKind::Protocol));
    let (parser, _) = parse("nonsense"); assert!(matches!(parser.finish(false, "crashed".into(), None, Duration::ZERO, &mut |_| {}).unwrap_err().kind, ErrorKind::ProcessCrashed));
}
#[test]
#[ignore = "Calls the installed CLI and consumes subscription usage"]
fn real_cli_stream_and_cancel() {
    let provider = ClaudeCliProvider::new(detect().expect("CLI installed"));
    let req = Request { request_id: "test".into(), system: "Be terse.".into(), prompt: "Say only Lantern ready.".into(), model: Some("haiku".into()), effort: Some("low".into()) };
    let mut chunks = String::new(); let result = provider.stream(&req, Arc::new(AtomicBool::new(false)), &mut |t| chunks.push_str(t)).unwrap();
    assert_eq!(result.text, chunks); assert!(!result.model.is_empty());
    let mut req = req; req.prompt = "Write a detailed 5000-word essay about ocean tides.".into();
    let cancel = Arc::new(AtomicBool::new(false)); let flag = cancel.clone();
    let worker = std::thread::spawn(move || { std::thread::sleep(Duration::from_millis(300)); flag.store(true, Ordering::SeqCst); });
    let start = Instant::now(); let err = provider.stream(&req, cancel, &mut |_| {}).unwrap_err(); worker.join().unwrap();
    assert!(matches!(err.kind, ErrorKind::Cancelled)); assert!(start.elapsed() < Duration::from_secs(5));
}
#[test]
#[cfg(windows)]
fn job_object_kills_child_and_grandchild() {
    let mut cmd = process::command(std::path::Path::new("powershell.exe"));
    cmd.args(["-NoProfile", "-Command", "Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile -Command Start-Sleep -Seconds 30' -WindowStyle Hidden; Start-Sleep -Seconds 30"]);
    cmd.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    let mut child = cmd.spawn().unwrap(); let tree = process::ProcessTree::attach(&child).unwrap();
    let start = Instant::now(); while tree.active_processes() < 2 && start.elapsed() < Duration::from_secs(10) { std::thread::sleep(Duration::from_millis(20)); }
    let count = tree.active_processes(); tree.kill(); child.wait().unwrap();
    let start = Instant::now(); while tree.active_processes() > 0 && start.elapsed() < Duration::from_secs(5) { std::thread::sleep(Duration::from_millis(20)); }
    assert!(count >= 2, "grandchild was not started"); assert_eq!(tree.active_processes(), 0);
}
