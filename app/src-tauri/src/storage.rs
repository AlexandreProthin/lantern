//! ST-1..50: atomic library I/O. Library and app config paths are caller supplied.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::{HashMap, HashSet}, fs, io::Write, path::{Path, PathBuf}};
use crate::paths::{reject_link, subject_path};
type Result<T> = std::result::Result<T, String>;
fn io(e: impl std::fmt::Display) -> String { e.to_string() }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Stamp { pub size: u64, pub modified_ns: String, pub hash: String }
fn stamp(path: &Path, bytes: &[u8]) -> Result<Stamp> {
    let metadata = fs::metadata(path).map_err(io)?;
    Ok(Stamp { size: metadata.len(), modified_ns: metadata.modified().map_err(io)?.duration_since(std::time::UNIX_EPOCH).map_err(io)?.as_nanos().to_string(), hash: format!("{:x}", Sha256::digest(bytes)) })
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Loaded { pub subject: Value, pub stamp: Stamp, pub read_only: bool }
pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let parent = path.parent().ok_or("File has no parent")?;
    fs::create_dir_all(parent).map_err(io)?; reject_link(parent)?; reject_link(path)?;
    let mut tmp = tempfile::NamedTempFile::new_in(parent).map_err(io)?;
    tmp.write_all(bytes).map_err(io)?; tmp.as_file().sync_all().map_err(io)?;
    tmp.persist(path).map_err(io)?; Ok(())
}
pub fn write_json(path: &Path, value: &Value) -> Result<()> { atomic_write(path, &serde_json::to_vec_pretty(value).map_err(io)?) }
pub fn validate_subject(s: &Value, id: &str) -> Result<()> {
    if s["format"] != "lantern/1" || s["id"] != id || s["title"].as_str().is_none_or(|s| s.trim().is_empty()) || !s["createdAt"].is_string() { return Err("Invalid lantern/1 subject".into()); }
    let rooms = s["rooms"].as_object().ok_or("Missing room visits")?;
    if rooms.is_empty() { return Err("Missing room visits".into()); }
    for visit in rooms.values() {
        let nodes = visit["nodes"].as_object().ok_or("Missing nodes")?;
        let root = visit["rootId"].as_str().ok_or("Missing root")?;
        let focus = visit["focusId"].as_str().ok_or("Missing focus")?;
        if !nodes.contains_key(root) || !nodes.contains_key(focus) || !visit["log"].is_array() { return Err("Invalid visit root, focus or log".into()); }
        for (key, n) in nodes {
            let parents = n["parents"].as_array().ok_or("Missing parents")?;
            if n["id"] != *key || parents.len() != usize::from(key != root) || parents.iter().any(|p| p.as_str().is_none_or(|p| !nodes.contains_key(p))) { return Err("Invalid node id or parent".into()); }
            let state = n["state"].as_str().ok_or("Missing state")?;
            if !["open", "lit", "understood", "dismissed"].contains(&state) { return Err("Unknown state".into()); }
            if (state == "understood" && ![json!("self"), json!("demonstrated")].contains(&n["understoodBy"])) || (state != "understood" && !n["understoodBy"].is_null()) { return Err("Invalid understoodBy".into()); }
            if !n["content"].is_string() || !n["title"].is_string() || !n["hook"].is_string() || !n["dialogue"].is_array() { return Err("Invalid node text".into()); }
        }
        let mut done = HashSet::new();
        for start in nodes.keys() {
            let mut chain = HashSet::new(); let mut current = Some(start.as_str());
            while let Some(id) = current {
                if done.contains(id) { break; }
                if !chain.insert(id) { return Err("Cycle in graph".into()); }
                current = nodes[id]["parents"][0].as_str();
            }
            done.extend(chain);
        }
    }
    Ok(())
}
pub fn load_subject(library: &Path, id: &str) -> Result<Loaded> {
    let path = subject_path(library, id)?; let bytes = fs::read(&path).map_err(io)?;
    let subject: Value = serde_json::from_slice(&bytes).map_err(io)?;
    let major = subject["format"].as_str().and_then(|s| s.strip_prefix("lantern/")).and_then(|s| s.parse::<u32>().ok()).ok_or("Unsupported subject format")?;
    if major == 1 { validate_subject(&subject, id)?; }
    else if major < 1 || subject["id"] != id { return Err("Unsupported subject format".into()); }
    Ok(Loaded { subject, stamp: stamp(&path, &bytes)?, read_only: major > 1 })
}
#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SaveResult {
    Saved { stamp: Stamp }, Reloaded { loaded: Loaded },
    Conflict { loaded: Loaded, #[serde(rename = "conflictPath")] conflict_path: PathBuf },
}
/// expected=None means create-only. A stale receipt cannot overwrite silently.
pub fn save_subject(library: &Path, subject: &Value, expected: Option<&Stamp>, dirty: bool) -> Result<SaveResult> {
    if !library.is_dir() { return Err("Library folder is unavailable".into()); }
    let id = subject["id"].as_str().ok_or("Missing id")?; validate_subject(subject, id)?;
    let path = subject_path(library, id)?;
    let disk = if path.exists() { Some(load_subject(library, id)?) } else { None };
    let changed = match (&disk, expected) { (Some(d), Some(e)) => &d.stamp != e, (None, None) => false, _ => true };
    if disk.as_ref().is_some_and(|d| d.read_only) { return Err("Newer format is read-only".into()); }
    if changed {
        if !dirty { return disk.map(|loaded| SaveResult::Reloaded { loaded }).ok_or("Subject was deleted externally".into()); }
        let suffix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(io)?.as_nanos();
        let conflict_path = path.with_file_name(format!("{id}.conflict-{suffix}.json")); write_json(&conflict_path, subject)?;
        return match disk {
            Some(loaded) => Ok(SaveResult::Conflict { loaded, conflict_path }),
            None => Err(format!("Subject was deleted externally; local copy saved to {}", conflict_path.display())),
        };
    }
    if !dirty { return disk.map(|d| SaveResult::Saved { stamp: d.stamp }).ok_or("Nothing to save".into()); }
    let bytes = serde_json::to_vec_pretty(subject).map_err(io)?;
    atomic_write(&path, &bytes)?;
    Ok(SaveResult::Saved { stamp: stamp(&path, &bytes)? })
}
#[derive(Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState { pub last_opened_at: HashMap<String, String>, pub recents: Vec<String> }
fn state_path(config: &Path) -> PathBuf { config.join("state.json") }
pub fn read_state(config: &Path) -> Result<AppState> {
    let path = state_path(config); if !path.exists() { return Ok(AppState::default()); }
    serde_json::from_slice(&fs::read(path).map_err(io)?).map_err(io)
}
pub fn record_open(config: &Path, id: &str, at: &str) -> Result<AppState> {
    subject_path(Path::new("."), id)?; let mut state = read_state(config)?;
    state.last_opened_at.insert(id.into(), at.into()); state.recents.retain(|s| s != id); state.recents.insert(0, id.into());
    write_json(&state_path(config), &serde_json::to_value(&state).map_err(io)?)?; Ok(state)
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheEntry { pub modified_ns: u128, pub size: u64, pub summary: Value }
type Cache = HashMap<String, CacheEntry>;
fn read_cache(config: &Path) -> Cache { fs::read(config.join("summary-cache.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default() }
pub fn summary(subject: &Value) -> Value {
    let v = &subject["rooms"]["learn"];
    let nodes: Vec<&Value> = v["nodes"].as_object().map(|ns| ns.values().filter(|n| n["state"] != "dismissed").collect()).unwrap_or_default();
    let count = |state: &str| nodes.iter().filter(|n| n["state"] == state).count();
    let mut input = 0u64; let mut output = 0u64; let mut models = HashMap::<String, u64>::new(); let mut latest = HashMap::new();
    let log = v["log"].as_array().cloned().unwrap_or_default();
    for (i, g) in log.iter().enumerate() {
        input += g["usage"]["input"].as_u64().unwrap_or(0); let out = g["usage"]["output"].as_u64().unwrap_or(0); output += out;
        let model = g["model"].as_str().unwrap_or("unknown").to_string(); *models.entry(model.clone()).or_default() += out; latest.insert(model, i);
    }
    let main = models.keys().max_by_key(|m| (models[*m], latest[*m]));
    json!({ "id": subject["id"], "title": subject["title"], "createdAt": subject["createdAt"], "tone": v["tone"],
        "total": nodes.len(), "lit": count("lit") + count("understood"), "dark": count("open"), "understood": count("understood"),
        "demonstrated": nodes.iter().filter(|n| n["state"] == "understood" && n["understoodBy"] == "demonstrated").count(),
        "self": nodes.iter().filter(|n| n["state"] == "understood" && n["understoodBy"] == "self").count(),
        "input": input, "output": output, "tokens": input + output, "mainModel": main, "modelOutputs": models, "generations": log.len() })
}
pub fn list_subjects(library: &Path, config: &Path) -> Result<Vec<Value>> {
    if !library.is_dir() { return Err("Library folder is unavailable".into()); }
    let folder = library.join("subjects"); reject_link(&folder)?;
    let mut cache = read_cache(config); let mut seen = HashSet::new(); let mut out = Vec::new();
    if !folder.exists() { fs::create_dir_all(&folder).map_err(io)?; }
    for entry in fs::read_dir(&folder).map_err(io)? {
        let path = entry.map_err(io)?.path(); if path.extension().is_none_or(|e| e != "json") { continue; }
        let Some(id) = path.file_stem().and_then(|s| s.to_str()) else { continue; };
        if id.contains(".conflict-") { continue; } subject_path(library, id)?;
        let key = fs::canonicalize(&path).map_err(io)?.to_string_lossy().to_string(); seen.insert(key.clone());
        let metadata = fs::metadata(&path).map_err(io)?;
        let modified_ns = metadata.modified().map_err(io)?.duration_since(std::time::UNIX_EPOCH).map_err(io)?.as_nanos();
        if cache.get(&key).is_none_or(|c| c.size != metadata.len() || c.modified_ns != modified_ns) {
            let mut info = match load_subject(library, id) {
                Ok(loaded) => { let mut info = summary(&loaded.subject); info["readOnly"] = json!(loaded.read_only); info },
                Err(error) => json!({"id":id,"title":id,"unreadable":true,"error":error}),
            };
            info["path"] = json!(key);
            cache.insert(key.clone(), CacheEntry { size: metadata.len(), modified_ns, summary: info });
        }
        out.push(cache[&key].summary.clone());
    }
    let canonical_folder = folder.canonicalize().map_err(io)?;
    cache.retain(|key, _| seen.contains(key) || !Path::new(key).starts_with(&canonical_folder));
    write_json(&config.join("summary-cache.json"), &serde_json::to_value(cache).map_err(io)?)?;
    out.sort_by(|a, b| a["title"].as_str().cmp(&b["title"].as_str())); Ok(out)
}
pub fn delete_subject(library: &Path, config: &Path, id: &str) -> Result<()> {
    let path = subject_path(library, id)?; let key = fs::canonicalize(&path).map_err(io)?.to_string_lossy().to_string();
    crate::paths::recycle_file(&path)?;
    let mut state = read_state(config)?; state.last_opened_at.remove(id); state.recents.retain(|s| s != id);
    write_json(&state_path(config), &serde_json::to_value(state).map_err(io)?)?;
    let mut cache = read_cache(config); cache.remove(&key);
    write_json(&config.join("summary-cache.json"), &serde_json::to_value(cache).map_err(io)?)
}
/// Forward migration of the PoC only; backup first, then replace (ST-40..42).
pub fn import_poc(library: &Path) -> Result<Vec<String>> {
    let folder = library.join("subjects"); if !folder.exists() { return Ok(vec![]); } reject_link(&folder)?;
    let mut imported = vec![];
    for entry in fs::read_dir(&folder).map_err(io)? {
        let path = entry.map_err(io)?.path(); if path.extension().is_none_or(|e| e != "json") { continue; }
        let Some(id) = path.file_stem().and_then(|s| s.to_str()) else { continue; };
        if id.contains(".conflict-") { continue; } subject_path(library, id)?;
        let bytes = fs::read(&path).map_err(io)?; let s: Value = serde_json::from_slice(&bytes).map_err(io)?;
        if s["format"] != "lantern-poc/1" { continue; } if s["id"] != id { return Err("PoC filename/id mismatch".into()); }
        let mut nodes = s["nodes"].as_object().ok_or("Missing PoC nodes")?.clone();
        for n in nodes.values_mut() {
            let object = n.as_object_mut().ok_or("Invalid PoC node")?;
            let parent = object.remove("parentId").unwrap_or(Value::Null);
            object.insert("parents".into(), if parent.is_null() { json!([]) } else { json!([parent]) });
            object.insert("understoodBy".into(), if object.get("state") == Some(&json!("understood")) { json!("demonstrated") } else { Value::Null });
            object.insert("createdBy".into(), if object.get("id") == Some(&s["rootId"]) { json!("learner") } else { json!("tutor") }); object.insert("author".into(), json!({"kind":"unknown"}));
            if let Some(turns) = object.get_mut("dialogue").and_then(Value::as_array_mut) { for turn in turns { turn["author"] = json!({"kind":"unknown"}); } }
        }
        let converted = json!({ "format":"lantern/1", "id":s["id"], "title":s["title"], "createdAt":s["createdAt"],
            "rooms": {"learn": {"tone":"curious", "model":"opus", "effort":"medium", "rootId":s["rootId"], "focusId":s["focusId"], "nodes":nodes, "log":[]}} });
        validate_subject(&converted, id)?;
        let backup = folder.join(".poc-backup").join(path.file_name().ok_or("Missing filename")?); reject_link(backup.parent().ok_or("Missing backup directory")?)?;
        if !backup.exists() { atomic_write(&backup, &bytes)?; }
        write_json(&path, &converted)?; imported.push(id.into());
    }
    Ok(imported)
}
#[cfg(test)]
mod tests;
