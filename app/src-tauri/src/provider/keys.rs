//! CE-70 to CE-74: API keys in Windows Credential Manager, one generic credential per endpoint, bound to the host it was saved for.
use super::ErrorKind;
use reqwest::{header::HeaderValue, Url};
use serde::Serialize;
use zeroize::Zeroizing;

/// The frontend's endpoint id rule, `^[a-z0-9-]{1,32}$`.
pub fn valid_id(id: &str) -> bool { (1..=32).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-') }
fn target(id: &str) -> Result<String, String> { if valid_id(id) { Ok(format!("Lantern/endpoint/{id}")) } else { Err("Not a valid endpoint id".into()) } }
/// A bearer token as RFC 6750 writes it (`b64token`): it stays the same inside JSON, so redaction finds every echo of it.
pub fn valid_key(key: &str) -> bool {
    let body = key.trim_end_matches('=');
    !body.is_empty() && key.len() <= 2560 && body.bytes().all(|b| b.is_ascii_alphanumeric() || b"-._~+/".contains(&b))
}
/// CE-72: the address a key belongs to, `host` or `host:port` when the port is not the scheme's own.
pub fn host_of(url: &Url) -> String {
    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    match url.port() { Some(port) => format!("{host}:{port}"), None => host }
}

/// CE-71: what Settings may know about a key; the key itself is never in it.
#[derive(Debug, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KeyStatus { pub set: bool, pub last4: Option<String>, pub host: Option<String> }
pub struct Stored { pub key: Zeroizing<String>, pub host: String }

/// CE-70, CE-72: saves the key for `base_url`'s host, https only. The caller's copy is wiped when it drops.
pub fn set(id: &str, base_url: &str, key: Zeroizing<String>) -> Result<KeyStatus, String> {
    let target = target(id)?;
    let url = Url::parse(base_url.trim_end_matches('/')).map_err(|_| "Not a valid URL".to_string())?;
    if url.scheme() != "https" { return Err("A key is only saved for an https:// address".into()); }
    if !url.username().is_empty() || url.password().is_some() || url.host_str().is_none() { return Err("The URL must name a host, with no user name or password".into()); }
    let key = Zeroizing::new(key.trim().to_string());
    if !valid_key(&key) { return Err("This does not look like an API key: letters, digits and - . _ ~ + / only, at most 2560 characters".into()); }
    store::write(&target, &host_of(&url), key.as_bytes())?;
    status(id)
}
/// CE-71: whether a key is set, its last 4 characters (none for a key under 8) and its host.
pub fn status(id: &str) -> Result<KeyStatus, String> {
    Ok(match read(id)? {
        None => KeyStatus::default(),
        Some(s) => { let n = s.key.chars().count();
            KeyStatus { set: true, last4: (n >= 8).then(|| s.key.chars().skip(n - 4).collect()), host: Some(s.host) } }
    })
}
/// CE-75: removing a key that is not there is not an error.
pub fn remove(id: &str) -> Result<(), String> { store::delete(&target(id)?).map(|_| ()) }
pub fn read(id: &str) -> Result<Option<Stored>, String> {
    let Some((blob, host)) = store::read(&target(id)?)? else { return Ok(None) };
    let key = Zeroizing::new(String::from_utf8(blob.to_vec()).map_err(|_| "The stored key is not text; save it again".to_string())?);
    Ok(Some(Stored { key, host }))
}

/// CE-71, CE-72: the key to send with one call to `url`, read at each call. No key: the call is the keyless call it always was.
/// A key saved for another address, or a call that is not https, fails before anything is sent.
pub fn authorize(id: &str, url: &Url) -> Result<Option<Zeroizing<String>>, (ErrorKind, String)> {
    if !valid_id(id) { return Ok(None); }
    let stored = match read(id) {
        Ok(s) => s,
        // Over http no key can be sent anyway, so a store that cannot be read leaves local endpoints as they are.
        Err(_) if url.scheme() != "https" => return Ok(None),
        Err(e) => return Err((ErrorKind::Protocol, format!("Could not read this endpoint's key: {e}"))),
    };
    let Some(s) = stored else { return Ok(None) };
    let host = host_of(url);
    if s.host != host { return Err((ErrorKind::KeyRejected, format!("This endpoint's key was saved for {}, not {host}; Lantern does not send it to another address. Save the key again for this address.", s.host))); }
    if !secure(url) { return Err((ErrorKind::KeyRejected, format!("This endpoint's key is only sent over https://, and the address is {}://; Lantern did not send it.", url.scheme()))); }
    Ok(Some(s.key))
}
#[cfg(not(test))] fn secure(url: &Url) -> bool { url.scheme() == "https" }
/// Tests only: lets a thread send a key to its own loopback test server over http, which has no TLS.
#[cfg(test)] thread_local! { pub static LOOPBACK_HTTP: std::cell::Cell<bool> = const { std::cell::Cell::new(false) }; }
#[cfg(test)] fn secure(url: &Url) -> bool { url.scheme() == "https" || (LOOPBACK_HTTP.with(|f| f.get()) && url.host_str() == Some("127.0.0.1")) }
/// CE-74: the header value is marked sensitive, so reqwest keeps it out of its debug output; the formatted copy is wiped.
pub fn bearer(key: &str) -> Result<HeaderValue, String> {
    let text = Zeroizing::new(format!("Bearer {key}"));
    let mut value = HeaderValue::from_str(&text).map_err(|_| "The stored key cannot be sent in a header; save it again".to_string())?;
    value.set_sensitive(true); Ok(value)
}

/// CE-73: the key's value (as is and percent-encoded), `Authorization` header values and bearer tokens become `[key]`.
pub fn redact(text: &str, key: Option<&str>) -> String {
    let mut out = text.to_string();
    if let Some(k) = key.filter(|k| !k.is_empty()) {
        out = out.replace(k, "[key]");
        let encode = |upper: bool| -> String { k.bytes().map(|b| if b.is_ascii_alphanumeric() || b"-._~".contains(&b) { (b as char).to_string() } else if upper { format!("%{b:02X}") } else { format!("%{b:02x}") }).collect() };
        for encoded in [encode(true), encode(false)] { if encoded != k { out = out.replace(&encoded, "[key]"); } }
    }
    scrub(&out)
}
fn scrub(text: &str) -> String {
    let (b, low) = (text.as_bytes(), text.to_ascii_lowercase().into_bytes()); let mut out = Vec::with_capacity(b.len()); let mut i = 0;
    while i < b.len() {
        match header_value(&low, i).or_else(|| bearer_token(&low, i)) {
            Some((start, end)) => { out.extend_from_slice(&b[i..start]); out.extend_from_slice(b"[key]"); i = end; }
            None => { out.push(b[i]); i += 1; }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}
fn skip(low: &[u8], mut j: usize, set: &[u8]) -> usize { while j < low.len() && set.contains(&low[j]) { j += 1; } j }
/// `authorization: value`, `"authorization":"value"`, `authorization=value`: the value up to the line's or the quote's end.
fn header_value(low: &[u8], i: usize) -> Option<(usize, usize)> {
    if !low[i..].starts_with(b"authorization") { return None; }
    let j = skip(low, skip(low, i + 13, b"\"'"), b" \t");
    if j >= low.len() || !b":=".contains(&low[j]) { return None; }
    let start = skip(low, skip(low, j + 1, b" \t"), b"\"'");
    let end = (start..low.len()).find(|&k| b"\r\n\"'".contains(&low[k])).unwrap_or(low.len());
    (end > start && &low[start..end] != b"[key]").then_some((start, end))
}
/// `Bearer token`: the token up to the next space or delimiter.
fn bearer_token(low: &[u8], i: usize) -> Option<(usize, usize)> {
    if !low[i..].starts_with(b"bearer") { return None; }
    let start = skip(low, i + 6, b" \t");
    if start == i + 6 { return None; }
    let end = (start..low.len()).find(|&k| b" \t\r\n\"',;}]<>".contains(&low[k])).unwrap_or(low.len());
    (end > start && &low[start..end] != b"[key]").then_some((start, end))
}

#[cfg(not(test))] use os as store;
#[cfg(test)] use memory as store;

/// The real store. Tests never reach it through `set`, `read` or `authorize`; only the ignored test calls it directly.
#[cfg(windows)]
pub mod os {
    use super::Zeroizing;
    use zeroize::Zeroize;
    use windows_sys::Win32::{Foundation::{GetLastError, ERROR_NOT_FOUND},
        Security::Credentials::{CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC}};
    fn wide(s: &str) -> Vec<u16> { s.encode_utf16().chain([0]).collect() }
    /// CE-70: a generic credential, this user on this machine only (not roaming); the comment holds the host (CE-72).
    pub fn write(target: &str, host: &str, blob: &[u8]) -> Result<(), String> {
        let (mut t, mut c, mut u) = (wide(target), wide(host), wide("Lantern"));
        let cred = CREDENTIALW { Type: CRED_TYPE_GENERIC, TargetName: t.as_mut_ptr(), Comment: c.as_mut_ptr(), CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_ptr() as *mut u8, Persist: CRED_PERSIST_LOCAL_MACHINE, UserName: u.as_mut_ptr(), ..Default::default() };
        if unsafe { CredWriteW(&cred, 0) } == 0 { return Err(format!("Windows Credential Manager did not save the key (error {})", unsafe { GetLastError() })); }
        Ok(())
    }
    /// The blob is copied into a wiped buffer, and the system's copy is zeroed before it is freed (CE-74).
    pub fn read(target: &str) -> Result<Option<(Zeroizing<Vec<u8>>, String)>, String> {
        let t = wide(target); let mut p: *mut CREDENTIALW = std::ptr::null_mut();
        if unsafe { CredReadW(t.as_ptr(), CRED_TYPE_GENERIC, 0, &mut p) } == 0 {
            let e = unsafe { GetLastError() };
            return if e == ERROR_NOT_FOUND { Ok(None) } else { Err(format!("Windows Credential Manager could not be read (error {e})")) };
        }
        let c = unsafe { &*p };
        let blob = if c.CredentialBlob.is_null() { Zeroizing::new(Vec::new()) } else {
            let system = unsafe { std::slice::from_raw_parts_mut(c.CredentialBlob, c.CredentialBlobSize as usize) };
            let copy = Zeroizing::new(system.to_vec()); system.zeroize(); copy };
        let host = if c.Comment.is_null() { String::new() } else {
            let len = (0..).take_while(|&n| unsafe { *c.Comment.add(n) } != 0).count();
            String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(c.Comment, len) }) };
        unsafe { CredFree(p as *const _) };
        Ok(Some((blob, host)))
    }
    /// Ok(false) when there was nothing to delete.
    pub fn delete(target: &str) -> Result<bool, String> {
        let t = wide(target);
        if unsafe { CredDeleteW(t.as_ptr(), CRED_TYPE_GENERIC, 0) } == 0 {
            let e = unsafe { GetLastError() };
            return if e == ERROR_NOT_FOUND { Ok(false) } else { Err(format!("Windows Credential Manager could not remove the key (error {e})")) };
        }
        Ok(true)
    }
}
/// Elsewhere there is no credential store, so no key can be saved and every endpoint is keyless.
#[cfg(not(windows))]
pub mod os {
    use super::Zeroizing;
    pub fn write(_: &str, _: &str, _: &[u8]) -> Result<(), String> { Err("API keys need Windows Credential Manager".into()) }
    pub fn read(_: &str) -> Result<Option<(Zeroizing<Vec<u8>>, String)>, String> { Ok(None) }
    pub fn delete(_: &str) -> Result<bool, String> { Ok(false) }
}
/// Tests plant fake keys here instead of the user's Credential Manager.
#[cfg(test)]
pub mod memory {
    use super::Zeroizing;
    use std::{collections::BTreeMap, sync::Mutex};
    static PLANTED: Mutex<BTreeMap<String, (Vec<u8>, String)>> = Mutex::new(BTreeMap::new());
    pub fn write(target: &str, host: &str, blob: &[u8]) -> Result<(), String> { PLANTED.lock().unwrap().insert(target.into(), (blob.to_vec(), host.into())); Ok(()) }
    pub fn read(target: &str) -> Result<Option<(Zeroizing<Vec<u8>>, String)>, String> { Ok(PLANTED.lock().unwrap().get(target).map(|(b, h)| (Zeroizing::new(b.clone()), h.clone()))) }
    pub fn delete(target: &str) -> Result<bool, String> { Ok(PLANTED.lock().unwrap().remove(target).is_some()) }
}

#[cfg(test)] #[path = "keys_tests.rs"] mod tests;
