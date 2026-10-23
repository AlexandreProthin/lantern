use super::{devices::{self, Registry}, rights, server, tls};
use crate::provider::endpoint::Endpoint;
use serde_json::json;
use std::net::IpAddr;

fn ip(s: &str) -> IpAddr { s.parse().unwrap() }
fn endpoint(id: &str, base: &str, lan: bool) -> Endpoint {
    serde_json::from_value(json!({"id":id,"preset":"ollama","baseUrl":base,"lanConfirmed":lan,"thinking":"off"})).unwrap()
}
const SETTINGS: &str = r#"{"format":"lantern-settings/1","library":{"path":"C:\\Users\\me\\Documents\\Lantern"},"developer":{"updateFolder":"D:\\feed"},
  "provider":{"defaultModel":"opus","endpoints":[{"id":"e1","preset":"ollama","baseUrl":"http://192.168.1.20:11434/v1","lanConfirmed":true}]}}"#;

#[test]
fn nw20_21_rights() {
    for c in ["load_subject", "save_subject", "list_subjects", "delete_subject", "load_settings", "save_settings", "provider_status", "endpoint_key_status"] { assert!(rights::allowed(c), "{c}"); }
    for c in ["set_endpoint_key", "remove_endpoint_key", "pick_library", "switch_library", "validate_library", "reveal_subject", "reveal_library", "subject_file",
        "save_window_state", "snap_layouts", "open_external", "check_update", "install_update", "network_set", "network_pair", "network_forget_devices", "generate"] {
        assert!(!rights::allowed(c), "{c}");
    }
}

#[test]
fn nw2_peers() {
    for p in ["192.168.1.5", "10.0.0.2", "172.16.4.1", "127.0.0.1", "169.254.1.1", "100.64.0.1", "100.127.255.1", "::1", "fd00::1", "fe80::1", "::ffff:192.168.1.5"] { assert!(rights::peer_allowed(ip(p)), "{p}"); }
    for p in ["8.8.8.8", "100.128.0.1", "172.32.0.1", "2001:db8::1", "::ffff:8.8.8.8"] { assert!(!rights::peer_allowed(ip(p)), "{p}"); }
}

#[test]
fn nw22_library_is_the_desktops() {
    let settings: serde_json::Value = serde_json::from_str(SETTINGS).unwrap();
    let library = rights::library_of(&settings, "C:\\default");
    assert_eq!(library, "C:\\Users\\me\\Documents\\Lantern");
    let mut args = json!({"library":"C:\\Windows\\System32","id":"tcp"});
    rights::override_library(&mut args, &library);
    assert_eq!(args, json!({"library":"C:\\Users\\me\\Documents\\Lantern","id":"tcp"}));
    let mut none = json!({"id":"tcp"}); rights::override_library(&mut none, &library); assert_eq!(none, json!({"id":"tcp"}));
    assert_eq!(rights::library_of(&json!({}), "C:\\default"), "C:\\default");
}

#[test]
fn nw23_remote_settings_keep_admin_fields() {
    let stored: serde_json::Value = serde_json::from_str(SETTINGS).unwrap();
    let remote = json!({"format":"lantern-settings/1","library":{"path":"E:\\elsewhere"},"developer":{"updateFolder":"E:\\evil"},
        "provider":{"defaultModel":"sonnet","endpoints":[]},"appearance":{"backdrop":false}});
    let merged = rights::merge_settings(remote, &stored).unwrap();
    assert_eq!(merged["library"], stored["library"]);
    assert_eq!(merged["developer"], stored["developer"]);
    assert_eq!(merged["provider"]["endpoints"], stored["provider"]["endpoints"]);
    assert_eq!(merged["provider"]["defaultModel"], "sonnet");
    assert_eq!(merged["appearance"]["backdrop"], false);
    // Fields the file does not have are not created by a device.
    let merged = rights::merge_settings(json!({"developer":{"x":1},"provider":{"endpoints":[{"id":"new"}]}}), &json!({"provider":{}})).unwrap();
    assert!(merged.get("developer").is_none()); assert!(merged["provider"].get("endpoints").is_none());
    assert!(rights::merge_settings(json!([]), &stored).is_err());
}

#[test]
fn nw24_endpoints_must_match_the_settings() {
    let settings: serde_json::Value = serde_json::from_str(SETTINGS).unwrap();
    assert!(rights::check_endpoint(&endpoint("e1", "http://192.168.1.20:11434/v1/", true), &settings).is_ok());
    assert!(rights::check_endpoint(&endpoint("e1", "http://192.168.1.99:11434/v1", true), &settings).is_err());
    assert!(rights::check_endpoint(&endpoint("e1", "http://192.168.1.20:11434/v1", false), &settings).is_err());
    assert!(rights::check_endpoint(&endpoint("e2", "http://192.168.1.20:11434/v1", true), &settings).is_err());
}

#[test]
fn nw10_14_pairing() {
    let dir = tempfile::tempdir().unwrap(); let registry = Registry::open(dir.path()); let peer = ip("192.168.1.7");
    assert!(registry.pair(peer, "NOPE", "phone").is_err());
    let code = registry.new_pairing().unwrap(); assert_eq!(code.len(), 8);
    let spaced = format!("{} {}", &code[..4], code[4..].to_lowercase());
    let token = registry.pair(peer, &spaced, "phone").unwrap();
    assert_eq!(token.len(), 64); assert!(registry.check(&token)); assert!(!registry.check("x"));
    // Single use.
    assert!(registry.pair(peer, &code, "phone").is_err());
    // Only the hash is stored, and it survives a restart.
    let file = std::fs::read_to_string(dir.path().join("devices.json")).unwrap();
    assert!(!file.contains(&token)); assert!(file.contains(&devices::hash(&token)));
    assert!(Registry::open(dir.path()).check(&token));
    assert_eq!(registry.devices().len(), 1); assert_eq!(registry.devices()[0].agent, "phone");
    registry.forget_all().unwrap(); assert!(!registry.check(&token)); assert!(!Registry::open(dir.path()).check(&token));
}

#[test]
fn nw14_attempts_are_limited() {
    let dir = tempfile::tempdir().unwrap(); let registry = Registry::open(dir.path()); let peer = ip("192.168.1.8");
    for _ in 0..5 { assert!(registry.pair(peer, "WRONG", "").is_err()); }
    let code = registry.new_pairing().unwrap();
    assert!(registry.pair(peer, &code, "").unwrap_err().contains("Too many"));
    assert!(registry.pair(ip("192.168.1.9"), &code, "").is_ok());
}

#[test]
fn nw1_config_defaults_off() {
    let dir = tempfile::tempdir().unwrap(); let registry = Registry::open(dir.path());
    assert_eq!(registry.config(), devices::Config { enabled: false, port: devices::DEFAULT_PORT });
    registry.save_config(&devices::Config { enabled: true, port: 5000 }).unwrap();
    assert_eq!(Registry::open(dir.path()).config(), devices::Config { enabled: true, port: 5000 });
}

#[test]
fn nw3_certificate_is_kept_until_a_name_is_missing() {
    let dir = tempfile::tempdir().unwrap();
    let names = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    let first = tls::identity(dir.path(), &names(&["192.168.1.10", "localhost"])).unwrap();
    assert_eq!(first.fingerprint.len(), 95);
    assert_eq!(tls::identity(dir.path(), &names(&["localhost"])).unwrap().fingerprint, first.fingerprint);
    let moved = tls::identity(dir.path(), &names(&["10.0.0.4", "localhost"])).unwrap();
    assert_ne!(moved.fingerprint, first.fingerprint);
    // The old address is still covered: going back does not make another one.
    assert_eq!(tls::identity(dir.path(), &names(&["192.168.1.10"])).unwrap().fingerprint, moved.fingerprint);
    assert!(tls::usable_name("desktop-ab12")); assert!(!tls::usable_name("bad name")); assert!(!tls::usable_name(""));
}

#[test]
fn nw4_index_is_marked_and_tauri_csp_dropped() {
    let html = r#"<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'"><title>Lantern</title></head></html>"#;
    let out = server::mark_index(html);
    assert!(out.contains(r#"<head><meta name="lantern-remote" content="1"><title>"#));
    assert!(!out.contains("Content-Security-Policy"));
}
