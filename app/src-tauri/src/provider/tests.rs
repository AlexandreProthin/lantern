use super::*;
fn parse(fixture: &str) -> (StreamParser, String) {
    let (parser, chunks, _) = parse_events(fixture); (parser, chunks)
}
/// Chunks as a caller shows them: a tool use starts the text over (IP-13).
fn parse_events(fixture: &str) -> (StreamParser, String, Vec<ToolUse>) {
    let mut parser = StreamParser::default(); let mut chunks = String::new(); let mut tools = Vec::new();
    for line in fixture.lines() { parser.consume(line, &mut |e| match e { Streamed::Text(t) => chunks.push_str(t), Streamed::Tool(t) => { chunks.clear(); tools.push(t.clone()); } }); }
    (parser, chunks, tools)
}
fn request(web: bool) -> Request {
    Request { request_id: "test".into(), system: "Be terse.".into(), prompt: "Say only Lantern ready.".into(), model: Some("haiku".into()), effort: Some("low".into()), web }
}
#[test]
fn learn_calls_get_no_tool_and_web_calls_only_search_and_fetch() {
    let tools_of = |args: &[String]| { let at = args.iter().position(|a| a == "--tools").unwrap(); args[at + 1].clone() };
    let plain = args(&request(false));
    assert_eq!(tools_of(&plain), ""); assert!(!plain.iter().any(|a| a == "--allowedTools" || a.contains("Web")));
    let web = args(&request(true));
    assert_eq!(tools_of(&web), "WebSearch,WebFetch");
    let at = web.iter().position(|a| a == "--allowedTools").unwrap();
    assert_eq!(web[at + 1..at + 3], ["WebSearch".to_string(), "WebFetch".to_string()]); assert!(web[at + 3].starts_with("--"));
    assert_eq!(web.iter().filter(|a| a.as_str() == "--tools" || a.as_str() == "--allowedTools").count(), 2);
    for args in [&plain, &web] { for flag in ["--safe-mode", "--strict-mcp-config", "--no-session-persistence", "--system-prompt"] { assert!(args.iter().any(|a| a == flag)); } }
    let parsed: Request = serde_json::from_value(serde_json::json!({"requestId":"r","system":"s","prompt":"p","model":null,"effort":null})).unwrap();
    assert!(!parsed.web, "a request without web gets no tool");
}
#[test]
fn recorded_web_call_counts_tools_reports_progress_and_keeps_the_answer() {
    let (parser, chunks, tools) = parse_events(include_str!("../../fixtures/provider/recorded-web.jsonl"));
    assert_eq!(tools, vec![ToolUse { name: "WebFetch".into(), detail: "bambulab.com".into() }, ToolUse { name: "WebSearch".into(), detail: "Bambu Lab A1 mini build volume specs".into() }]);
    let result = parser.finish(true, String::new(), Some("low".into()), Duration::ZERO, &mut |_| panic!("no fallback")).unwrap();
    assert_eq!(result.text, chunks); assert!(result.text.starts_with("Bambu Lab lists"));
    assert_eq!(result.model, "claude-opus-5-5");
    assert_eq!(result.tool_calls.unwrap().into_iter().collect::<Vec<_>>(), vec![("WebFetch".to_string(), 1), ("WebSearch".to_string(), 1)]);
}
#[test]
fn text_before_a_tool_use_is_not_the_answer_and_repeated_ids_count_once() {
    let raw = include_str!("../../fixtures/provider/recorded-web.jsonl"); let mut lines: Vec<String> = raw.lines().map(String::from).collect();
    let first_tool = lines.iter().position(|l| l.starts_with("{\"type\":\"assistant\"") && l.contains("tool_use")).unwrap();
    let preamble = serde_json::json!({"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"I'll check the maker's site."}}}).to_string();
    let repeated = lines[first_tool].clone(); lines.insert(first_tool + 1, repeated); lines.insert(first_tool, preamble);
    let (parser, chunks, tools) = parse_events(&lines.join("\n"));
    assert_eq!(tools.len(), 2); assert!(!chunks.contains("I'll check"));
    let result = parser.finish(true, String::new(), None, Duration::ZERO, &mut |_| {}).unwrap();
    assert_eq!(result.text, chunks); assert_eq!(result.tool_calls.unwrap()["WebFetch"], 1);
    let (parser, _) = parse(include_str!("../../fixtures/provider/recorded-ok.jsonl"));
    let plain = parser.finish(true, String::new(), None, Duration::ZERO, &mut |_| {}).unwrap();
    assert!(plain.tool_calls.is_none()); assert!(!serde_json::to_value(&plain).unwrap().as_object().unwrap().contains_key("toolCalls"));
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
    for (text, kind) in [("Please /login", ErrorKind::NotLoggedIn), ("Usage limit reached", ErrorKind::UsageLimit), ("Unknown model", ErrorKind::ModelUnknown), ("API Error: 400 Claude Code 2.1.274 does not support this model; version 2.1.280 or newer is required.", ErrorKind::ModelUnknown), ("Fable 5.1 requires usage credits. Switch to another model, or manage usage credits at claude.ai/settings/usage?from=cc_cli_limit_message, to continue.", ErrorKind::ModelUnknown), ("fetch failed", ErrorKind::Network), ("Unexpected failure", ErrorKind::ProcessCrashed)] {
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
    let req = request(false);
    let mut chunks = String::new(); let result = provider.stream(&req, Arc::new(AtomicBool::new(false)), &mut |e| if let Streamed::Text(t) = e { chunks.push_str(t) }).unwrap();
    assert_eq!(result.text, chunks); assert!(!result.model.is_empty()); assert!(result.tool_calls.is_none());
    let mut req = req; req.prompt = "Write a detailed 5000-word essay about ocean tides.".into();
    let cancel = Arc::new(AtomicBool::new(false)); let flag = cancel.clone();
    let worker = std::thread::spawn(move || { std::thread::sleep(Duration::from_millis(300)); flag.store(true, Ordering::SeqCst); });
    let start = Instant::now(); let err = provider.stream(&req, cancel, &mut |_| {}).unwrap_err(); worker.join().unwrap();
    assert!(matches!(err.kind, ErrorKind::Cancelled)); assert!(start.elapsed() < Duration::from_secs(5));
}
#[test]
#[ignore = "Calls the installed CLI with web tools and consumes subscription usage"]
fn real_cli_web_call_uses_only_search_and_fetch() {
    let provider = ClaudeCliProvider::new(detect().expect("CLI installed"));
    let mut req = request(true); req.model = None;
    req.prompt = "First read the file C:\\Windows\\win.ini and run the shell command `dir`. Then search the web for the Bambu Lab A1 mini build volume. One sentence.".into();
    let mut tools = Vec::new(); let result = provider.stream(&req, Arc::new(AtomicBool::new(false)), &mut |e| if let Streamed::Tool(t) = e { tools.push(t.name.clone()) }).unwrap();
    let calls = result.tool_calls.expect("the web was used");
    assert!(calls.keys().all(|name| name == "WebSearch" || name == "WebFetch"), "{calls:?}");
    assert_eq!(tools.len() as u64, calls.values().sum::<u64>());
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
