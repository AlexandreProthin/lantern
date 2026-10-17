use super::*;
use crate::provider::{endpoint::{model_info, models, Endpoint, EndpointProvider}, Cancel, Completion, InferenceProvider, ProviderError, Request};
use std::{io::{Read, Write}, net::TcpListener, sync::{atomic::AtomicBool, mpsc, Arc}, time::Duration};

/// Planted fake keys only, never a real one; each test has its own endpoint id, since tests run in parallel.
fn fake(n: u8) -> String { format!("nvapi-FAKE{n}-planted-0123456789abcdef+test/key==") }
fn plant(id: &str, host: &str, key: &str) { memory::write(&target(id).unwrap(), host, key.as_bytes()).unwrap(); }
fn endpoint(id: &str, preset: &str, base: &str) -> Endpoint { serde_json::from_value(serde_json::json!({"id": id, "preset": preset, "baseUrl": base})).unwrap() }
fn request() -> Request { Request { request_id: "k".into(), system: "Be terse.".into(), prompt: "Say Lantern ready.".into(), model: Some("nvidia/nemotron".into()), effort: None, web: false } }
fn call(e: Endpoint) -> Result<Completion, ProviderError> {
    let p = EndpointProvider { endpoint: e, stall_timeout: Duration::from_secs(5) }; let cancel: Cancel = Arc::new(AtomicBool::new(false));
    p.stream(&request(), cancel, &mut |_| {})
}
/// A one-shot server that hands the raw request to the test and answers with `respond(request)`.
fn serve(respond: impl Fn(&str) -> String + Send + 'static) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap(); let addr = listener.local_addr().unwrap(); let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let (mut s, _) = listener.accept().unwrap(); let mut buf = [0u8; 65536]; let n = s.read(&mut buf).unwrap_or(0);
        let raw = String::from_utf8_lossy(&buf[..n]).into_owned(); let _ = s.write_all(respond(&raw).as_bytes()); let _ = tx.send(raw);
    });
    (format!("http://{addr}"), rx)
}
fn header_line(raw: &str) -> String { raw.lines().find(|l| l.to_ascii_lowercase().starts_with("authorization:")).unwrap_or_default().to_string() }
fn reply(status: &str, body: &str) -> String { format!("HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()) }
fn loopback<T>(f: impl FnOnce() -> T) -> T { LOOPBACK_HTTP.with(|l| l.set(true)); let r = f(); LOOPBACK_HTTP.with(|l| l.set(false)); r }
fn no_key(text: &str, key: &str) { assert!(!text.contains(key) && !text.contains(&key[..20]), "the key leaked: {text}"); }

#[test]
fn ids_and_keys_are_checked_before_anything_is_stored() {
    for id in ["nvidia", "my-box-2", "a", &"x".repeat(32)] { assert!(valid_id(id), "{id}"); }
    for id in ["", "NVIDIA", "a/b", "a b", "../x", &"x".repeat(33)] { assert!(!valid_id(id), "{id}"); }
    assert!(set("NV", "https://integrate.api.nvidia.com/v1", Zeroizing::new(fake(1))).is_err());
    for key in ["", "has space", "quote\"d", "back\\slash", "new\nline", "é-accent"] { assert!(!valid_key(key), "{key:?}"); }
    assert!(valid_key(&fake(1)) && valid_key("abc"));
}
#[test]
fn a_key_is_saved_only_for_an_https_address() {
    for url in ["http://integrate.api.nvidia.com/v1", "http://localhost:11434/v1", "ftp://example.com", "https://user:pw@example.com/v1", "not a url"] {
        assert!(set("keys-https", url, Zeroizing::new(fake(2))).is_err(), "{url}");
    }
    assert_eq!(status("keys-https").unwrap(), KeyStatus::default());
}
#[test]
fn status_never_returns_the_key() {
    let key = fake(3);
    let s = set("keys-status", "https://Integrate.API.nvidia.com/v1/", Zeroizing::new(format!("  {key}\n"))).unwrap();
    assert_eq!(s, KeyStatus { set: true, last4: Some(key[key.len() - 4..].into()), host: Some("integrate.api.nvidia.com".into()) });
    let json = serde_json::to_string(&status("keys-status").unwrap()).unwrap(); no_key(&json, &key);
    assert!(json.contains("\"last4\"") && json.contains("\"host\""));
    plant("keys-short", "example.com", "abc1234"); assert_eq!(status("keys-short").unwrap().last4, None);
    remove("keys-status").unwrap(); assert_eq!(status("keys-status").unwrap(), KeyStatus::default()); remove("keys-status").unwrap();
    assert_eq!(host_of(&Url::parse("https://example.com:8443/v1").unwrap()), "example.com:8443");
}
#[test]
fn a_key_goes_only_to_its_host_over_https_and_fails_before_sending() {
    // A listener nobody may reach: a refused key must not even open the connection.
    let listener = TcpListener::bind("127.0.0.1:0").unwrap(); listener.set_nonblocking(true).unwrap(); let port = listener.local_addr().unwrap().port();
    plant("keys-host", "integrate.api.nvidia.com", &fake(4));
    let err = call(endpoint("keys-host", "custom", &format!("https://127.0.0.1:{port}/v1"))).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::KeyRejected) && err.details.contains("saved for integrate.api.nvidia.com"), "{err:?}");
    let err = models(&endpoint("keys-host", "custom", &format!("https://127.0.0.1:{port}/v1"))).unwrap_err();
    assert!(matches!(err.0, ErrorKind::KeyRejected), "{err:?}");
    plant("keys-http", &format!("127.0.0.1:{port}"), &fake(5));
    let err = call(endpoint("keys-http", "custom", &format!("http://127.0.0.1:{port}/v1"))).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::KeyRejected) && err.details.contains("https://"), "{err:?}");
    assert!(model_info(&endpoint("keys-http", "ollama", &format!("http://127.0.0.1:{port}/v1")), "m").is_err());
    assert!(listener.accept().is_err(), "a connection was opened");
    for e in [&err.details, &err.model] { no_key(e, &fake(5)); }
}
#[test]
fn a_keyless_endpoint_sends_no_authorization() {
    let done = "{\"model\":\"gemma4:e2b\",\"message\":{\"content\":\"ok\"},\"done\":true}\n";
    let (base, rx) = serve(move |_| format!("HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nConnection: close\r\n\r\n{done}"));
    assert_eq!(call(endpoint("keys-none", "ollama", &format!("{base}/v1"))).unwrap().text, "ok");
    assert!(!rx.recv().unwrap().to_ascii_lowercase().contains("authorization"));
}
#[test]
fn the_key_is_sent_as_a_bearer_header_to_its_host() {
    let (base, rx) = serve(|_| reply("200 OK", "{\"data\":[{\"id\":\"m\"}]}"));
    let key = fake(6); plant("keys-sent", &base["http://".len()..], &key);
    assert_eq!(loopback(|| models(&endpoint("keys-sent", "custom", &format!("{base}/v1")))).unwrap(), ["m"]);
    assert_eq!(header_line(&rx.recv().unwrap()).to_ascii_lowercase(), format!("authorization: bearer {}", key.to_ascii_lowercase()));
}
#[test]
fn a_server_echoing_the_header_in_a_401_body_leaks_nothing() {
    let (base, _rx) = serve(|raw| { let h = header_line(raw); reply("401 Unauthorized", &format!("{{\"error\":\"rejected {h}\",\"got\":{:?}}}", h)) });
    let key = fake(7); plant("keys-echo", &base["http://".len()..], &key);
    let err = loopback(|| call(endpoint("keys-echo", "custom", &format!("{base}/v1")))).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::KeyRejected), "{err:?}"); assert!(err.details.contains("[key]"), "{}", err.details); no_key(&err.details, &key);
    // NVIDIA's bad key is a 403 problem+json; here it echoes the key's value and its percent-encoded form.
    let encoded = key.replace('+', "%2B").replace('/', "%2F").replace('=', "%3D");
    let (base, _rx) = serve(move |raw| { let k = header_line(raw)["authorization: bearer ".len()..].to_string();
        reply("403 Forbidden", &format!("{{\"type\":\"about:blank\",\"title\":\"Forbidden\",\"detail\":\"key {k} is invalid\",\"instance\":\"/v1/models?k={}\"}}", k.replace('+', "%2B").replace('/', "%2F").replace('=', "%3D"))) });
    plant("keys-echo2", &base["http://".len()..], &key);
    let err = loopback(|| models(&endpoint("keys-echo2", "custom", &format!("{base}/v1")))).unwrap_err();
    assert!(matches!(err.0, ErrorKind::KeyRejected)); no_key(&err.1, &key); no_key(&err.1, &encoded);
}
#[test]
fn stream_errors_and_served_model_names_echoing_the_key_leak_nothing() {
    let (base, _rx) = serve(|raw| { let h = header_line(raw); let k = h["authorization: bearer ".len()..].to_string();
        format!("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\ndata: {}\n\n", serde_json::json!({"model": format!("served-{k}"), "error": {"message": format!("bad header {h}")}})) });
    let key = fake(8); plant("keys-stream", &base["http://".len()..], &key);
    let err = loopback(|| call(endpoint("keys-stream", "custom", &format!("{base}/v1")))).unwrap_err();
    no_key(&err.details, &key); no_key(&err.model, &key); assert!(err.model.contains("[key]"), "{}", err.model);
}
#[test]
fn transport_errors_leak_nothing() {
    let port = { let l = TcpListener::bind("127.0.0.1:0").unwrap(); l.local_addr().unwrap().port() };
    let key = fake(9); plant("keys-refused", &format!("127.0.0.1:{port}"), &key);
    let err = loopback(|| call(endpoint("keys-refused", "custom", &format!("http://127.0.0.1:{port}/v1")))).unwrap_err();
    assert!(matches!(err.kind, ErrorKind::Unreachable), "{err:?}"); no_key(&err.details, &key);
    // A cut stream after the key went out.
    let (base, _rx) = serve(|_| "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nContent-Length: 500\r\n\r\ndata: {\"choices\":[{\"delta\":{\"content\":\"hal".into());
    plant("keys-cut", &base["http://".len()..], &key);
    let err = loopback(|| call(endpoint("keys-cut", "custom", &format!("{base}/v1")))).unwrap_err(); no_key(&err.details, &key);
}
#[test]
fn redaction_covers_headers_tokens_and_the_value() {
    let key = fake(10);
    for (text, k) in [
        (format!("Authorization: Bearer {key}\r\nHost: x"), Some(key.as_str())),
        (format!("{{\"authorization\":\"Bearer {key}\"}}"), None),
        (format!("headers: authorization=Bearer {key}; next"), None),
        (format!("token was bearer {key}, refused"), None),
        (format!("plain {key} in text"), Some(key.as_str())),
        (format!("q?k={}", key.replace('+', "%2b").replace('/', "%2f").replace('=', "%3d")), Some(key.as_str())),
    ] { let r = redact(&text, k); no_key(&r, &key); assert!(r.contains("[key]"), "{r}"); }
    assert_eq!(redact("authorization failed for this model", None), "authorization failed for this model");
    assert_eq!(redact("Authorization: [key]", None), "Authorization: [key]");
    assert_eq!(redact("é Bearer abc é", None), "é Bearer [key] é");
}
#[test]
#[ignore = "Writes a fake key to the user's Windows Credential Manager under Lantern/endpoint/lantern-test-key, then removes it"]
fn real_credential_store_round_trip() {
    let target = target("lantern-test-key").unwrap(); let key = fake(11);
    os::write(&target, "example.invalid", key.as_bytes()).unwrap();
    let (blob, host) = os::read(&target).unwrap().unwrap();
    let removed = os::delete(&target); assert_eq!(removed, Ok(true));
    assert_eq!((blob.as_slice(), host.as_str()), (key.as_bytes(), "example.invalid"));
    assert_eq!(os::read(&target).unwrap(), None); assert_eq!(os::delete(&target), Ok(false));
}
