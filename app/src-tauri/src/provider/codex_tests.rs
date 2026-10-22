use super::*;
fn request(web: bool) -> Request {
    Request { request_id: "test".into(), system: "Be terse.".into(), prompt: "Say only Lantern ready.".into(), model: Some("gpt-6-luna".into()), effort: Some("low".into()), web }
}
/// Chunks as a caller shows them: a tool use starts the text over (IP-13).
fn parse(fixture: &str) -> (CodexParser, String, Vec<ToolUse>) {
    let mut parser = CodexParser::default(); let mut chunks = String::new(); let mut tools = Vec::new();
    for line in fixture.lines() { parser.consume(line, &mut |e| match e { Streamed::Text(t) => chunks.push_str(t), Streamed::Tool(t) => { chunks.clear(); tools.push(t.clone()); } }); }
    (parser, chunks, tools)
}
fn config(args: &[String]) -> Vec<String> { args.windows(2).filter(|w| w[0] == "-c").map(|w| w[1].clone()).collect() }
fn our_files() -> usize {
    let prefix = format!("lantern-codex-{}-", std::process::id());
    std::fs::read_dir(std::env::temp_dir()).unwrap().filter_map(|e| e.ok()).filter(|e| e.file_name().to_string_lossy().starts_with(&prefix)).count()
}
#[test]
fn calls_run_without_shell_or_user_config_and_search_only_for_the_web() {
    let file = Path::new(r"C:\Temp\lantern-codex-1-0.md");
    let plain = args(&request(false), file);
    assert_eq!(plain[..2], ["exec".to_string(), "--json".to_string()]); assert_eq!(plain.last().unwrap(), "-");
    for flag in ["--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules"] { assert!(plain.iter().any(|a| a == flag), "{flag}"); }
    let at = plain.iter().position(|a| a == "--sandbox").unwrap(); assert_eq!(plain[at + 1], "read-only");
    let c = config(&plain);
    for want in ["approval_policy=\"never\"", "features.shell_tool=false", "project_doc_max_bytes=0", "web_search=\"disabled\"", "model_reasoning_effort=\"low\"",
        r#"model_instructions_file="C:\\Temp\\lantern-codex-1-0.md""#] { assert!(c.iter().any(|x| x == want), "{want} in {c:?}"); }
    let at = plain.iter().position(|a| a == "--model").unwrap(); assert_eq!(plain[at + 1], "gpt-6-luna");
    assert!(config(&args(&request(true), file)).iter().any(|x| x == "web_search=\"live\""));
    let bare = args(&Request { model: None, effort: None, ..request(false) }, file);
    assert!(!bare.iter().any(|a| a == "--model")); assert!(!config(&bare).iter().any(|x| x.starts_with("model_reasoning_effort")));
}
#[test]
fn web_call_counts_the_search_drops_the_preamble_and_streams_the_answer() {
    let (parser, chunks, tools) = parse(include_str!("../../fixtures/provider/codex-web.jsonl"));
    assert_eq!(tools, vec![ToolUse { name: "WebSearch".into(), detail: "Bambu Lab A1 mini build volume".into() }]);
    assert_eq!(chunks, "Bambu Lab lists a build volume of 180 × 180 × 180 mm.");
    let result = parser.finish(true, String::new(), "gpt-6-luna", Some("low".into()), Duration::ZERO).unwrap();
    assert_eq!(result.text, chunks); assert_eq!(result.model, "gpt-6-luna"); assert_eq!(result.resolved_effort.as_deref(), Some("low"));
    assert_eq!(result.tool_calls.unwrap()["WebSearch"], 1);
    // Cached tokens are counted apart, as Claude's are; reasoning is the thinking figure.
    assert_eq!((result.usage.input, result.usage.cache_read, result.usage.output, result.usage.thinking), (315, 24448, 122, 64));
    assert!(result.cost_usd.is_none());
}
#[test]
fn a_message_rewritten_by_an_update_replaces_what_was_kept_and_legacy_names_are_read() {
    let lines = [
        r#"{"type":"item.updated","item":{"id":"a","item_type":"assistant_message","text":"Draft"}}"#,
        r#"{"type":"item.completed","item":{"id":"a","item_type":"assistant_message","text":"Final answer"}}"#,
        r#"{"type":"turn.completed","usage":{"input_tokens":10,"cached_input_tokens":0,"output_tokens":3}}"#,
    ].join("\n");
    let (parser, _, _) = parse(&lines);
    let result = parser.finish(true, String::new(), "default", None, Duration::ZERO).unwrap();
    assert_eq!(result.text, "Final answer"); assert_eq!(result.usage.thinking, 0);
}
#[test]
fn a_failed_turn_is_classified_and_a_recovered_retry_is_not_an_error() {
    let (parser, _, _) = parse(include_str!("../../fixtures/provider/codex-failed.jsonl"));
    let err = parser.finish(false, String::new(), "gpt-6-luna", None, Duration::ZERO).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::UsageLimit), "{err:?}"); assert_eq!(err.model, "gpt-6-luna");
    let ok = [r#"{"type":"error","message":"Reconnecting... 1/5"}"#, r#"{"type":"item.completed","item":{"id":"m","type":"agent_message","text":"ready"}}"#,
        r#"{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}"#].join("\n");
    let (parser, _, _) = parse(&ok); assert_eq!(parser.finish(true, String::new(), "default", None, Duration::ZERO).unwrap().text, "ready");
}
#[test]
fn no_completed_turn_reads_stderr_and_an_empty_answer_is_a_protocol_error() {
    let (parser, _, _) = parse("");
    let err = parser.finish(false, "Error: Not logged in. Run `codex login`.".into(), "default", None, Duration::ZERO).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::NotLoggedIn), "{err:?}");
    let (parser, _, _) = parse(r#"{"type":"error","message":"stream disconnected before completion"}"#);
    assert!(matches!(parser.finish(false, String::new(), "default", None, Duration::ZERO).unwrap_err().kind, ErrorKind::Network));
    let (parser, _, _) = parse("not json\n");
    let err = parser.finish(false, String::new(), "default", None, Duration::ZERO).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::ProcessCrashed)); assert!(err.details.contains("1 invalid lines"), "{}", err.details);
    let (parser, _, _) = parse(r#"{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"output_tokens":0}}"#);
    assert!(matches!(parser.finish(true, String::new(), "default", None, Duration::ZERO).unwrap_err().kind, ErrorKind::Protocol));
    assert!(matches!(classify_codex("The 'gpt-9' model is not supported when using Codex with a ChatGPT account."), ErrorKind::ModelUnknown));
}
#[test]
fn a_missing_executable_is_not_installed_and_the_instructions_file_is_removed() {
    let provider = CodexCliProvider::new(std::env::temp_dir().join("lantern-no-codex-here.exe"));
    let before = our_files();
    let err = provider.stream(&request(false), std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)), &mut |_| {}).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::NotInstalled), "{err:?}"); assert_eq!(err.model, "gpt-6-luna");
    assert_eq!(our_files(), before);
}
#[test]
#[ignore = "Calls the installed Codex CLI and consumes ChatGPT plan usage"]
fn real_codex_call() {
    let provider = CodexCliProvider::new(detect().expect("Codex installed"));
    let mut seen = String::new();
    let result = provider.stream(&Request { model: None, ..request(false) }, std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)), &mut |e| if let Streamed::Text(t) = e { seen.push_str(t) }).unwrap();
    assert_eq!(result.text, seen); assert!(result.usage.output > 0);
}
