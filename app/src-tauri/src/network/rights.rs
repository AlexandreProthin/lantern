//! NW-2, NW-20..24: what a remote device may do, as pure functions the server and the tests share.
use serde_json::Value;
use std::net::IpAddr;
use crate::provider::endpoint::Endpoint;

/// NW-20: the commands a paired device may call through `/api/invoke`. `generate` has its own route.
pub const ALLOWED: &[&str] = &["default_library", "load_settings", "save_settings", "load_subject", "save_subject", "list_subjects",
    "record_open", "read_state", "save_companion_state", "append_amber_log", "amber_log_totals", "delete_subject", "subject_thumbnail",
    "import_poc", "provider_status", "cancel_generation", "endpoint_models", "endpoint_model_info", "endpoint_key_status"];
pub fn allowed(command: &str) -> bool { ALLOWED.contains(&command) }

/// NW-2: private, loopback, link-local, unique-local and CGNAT (100.64.0.0/10) peers only.
pub fn peer_allowed(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => { let [a, b, ..] = v4.octets(); v4.is_private() || v4.is_loopback() || v4.is_link_local() || (a == 100 && (64..128).contains(&b)) }
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => peer_allowed(IpAddr::V4(v4)),
            None => { let first = v6.segments()[0]; v6.is_loopback() || (first & 0xfe00) == 0xfc00 || (first & 0xffc0) == 0xfe80 }
        },
    }
}

/// NW-22: every `library` argument becomes the library in `settings.json`.
pub fn override_library(args: &mut Value, library: &str) {
    if let Some(map) = args.as_object_mut() { if map.contains_key("library") { map.insert("library".into(), Value::String(library.into())); } }
}

/// The settings' library, or the default one when the settings name none.
pub fn library_of(settings: &Value, default: &str) -> String {
    settings["library"]["path"].as_str().filter(|p| !p.is_empty()).map(crate::paths::plain_path).unwrap_or_else(|| default.into())
}

/// NW-23: a remote save keeps the stored file's `library`, `provider.endpoints` and `developer`.
pub fn merge_settings(mut remote: Value, stored: &Value) -> Result<Value, String> {
    if !remote.is_object() { return Err("Settings must be an object".into()); }
    for key in ["library", "developer"] {
        match stored.get(key) { Some(v) => { remote[key] = v.clone(); } None => { remote.as_object_mut().unwrap().remove(key); } }
    }
    if !remote["provider"].is_object() { remote["provider"] = serde_json::json!({}); }
    match stored["provider"].get("endpoints") {
        Some(v) => { remote["provider"]["endpoints"] = v.clone(); }
        None => { remote["provider"].as_object_mut().unwrap().remove("endpoints"); }
    }
    Ok(remote)
}

/// NW-24: an endpoint named by a remote call must be one of the settings' endpoints, address and all.
pub fn check_endpoint(endpoint: &Endpoint, settings: &Value) -> Result<(), String> {
    let stored = settings["provider"]["endpoints"].as_array().into_iter().flatten().find(|e| e["id"].as_str() == Some(endpoint.id.as_str()))
        .ok_or("This endpoint is not in the desktop's settings")?;
    let same = stored["preset"].as_str() == Some(endpoint.preset.as_str())
        && stored["baseUrl"].as_str().map(|u| u.trim_end_matches('/')) == Some(endpoint.base_url.trim_end_matches('/'))
        && stored["lanConfirmed"].as_bool().unwrap_or(false) == endpoint.lan_confirmed;
    if same { Ok(()) } else { Err("This endpoint differs from the desktop's settings".into()) }
}
