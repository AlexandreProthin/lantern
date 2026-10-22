//! NW-1, NW-10..14: the server's settings, the paired devices and the pairing codes, in `<config>/Lantern/network/`.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, net::IpAddr, path::{Path, PathBuf}, sync::Mutex, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};

pub const DEFAULT_PORT: u16 = 4317;
/// NW-10: a pairing code is good once, for 10 minutes.
pub const CODE_LIFE: Duration = Duration::from_secs(600);
/// NW-14: failed pairing attempts per address per minute.
const ATTEMPTS: usize = 5;
/// Letters and digits a person cannot confuse (no 0/O, 1/I/L).
const ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config { pub enabled: bool, pub port: u16 }
impl Default for Config { fn default() -> Self { Self { enabled: false, port: DEFAULT_PORT } } }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Device { pub hash: String, pub created: u64, pub last_seen: u64, pub agent: String }
/// What Settings shows of a device: never its token or full hash.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceView { pub id: String, pub created: u64, pub last_seen: u64, pub agent: String }

pub fn now_ms() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0) }
pub fn hash(token: &str) -> String { hex(&Sha256::digest(token.as_bytes())) }
pub fn hex(bytes: &[u8]) -> String { bytes.iter().map(|b| format!("{b:02x}")).collect() }
/// NW-11: 256 random bits.
pub fn new_token() -> Result<String, String> { let mut b = [0u8; 32]; getrandom::fill(&mut b).map_err(|e| e.to_string())?; Ok(hex(&b)) }
pub fn new_code() -> Result<String, String> {
    let mut b = [0u8; 8]; getrandom::fill(&mut b).map_err(|e| e.to_string())?;
    Ok(b.iter().map(|x| ALPHABET[*x as usize % ALPHABET.len()] as char).collect())
}
/// A typed code: case, spaces and dashes do not matter.
pub fn normalize_code(code: &str) -> String { code.chars().filter(|c| c.is_ascii_alphanumeric()).map(|c| c.to_ascii_uppercase()).collect() }

pub struct Registry {
    folder: PathBuf,
    devices: Mutex<Vec<Device>>,
    codes: Mutex<Vec<(String, Instant)>>,
    failures: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}
impl Registry {
    pub fn open(folder: &Path) -> Self {
        let devices = std::fs::read(folder.join("devices.json")).ok()
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
            .and_then(|v| serde_json::from_value::<Vec<Device>>(v["devices"].clone()).ok()).unwrap_or_default();
        Self { folder: folder.into(), devices: Mutex::new(devices), codes: Mutex::default(), failures: Mutex::default() }
    }
    pub fn folder(&self) -> &Path { &self.folder }
    pub fn config(&self) -> Config {
        std::fs::read(self.folder.join("config.json")).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
    }
    pub fn save_config(&self, config: &Config) -> Result<(), String> {
        crate::storage::write_json(&self.folder.join("config.json"), &serde_json::to_value(config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
    }
    fn save_devices(&self, devices: &[Device]) -> Result<(), String> {
        crate::storage::write_json(&self.folder.join("devices.json"), &serde_json::json!({"format":"lantern-devices/1","devices":devices})).map_err(|e| e.to_string())
    }
    pub fn devices(&self) -> Vec<DeviceView> {
        self.devices.lock().map(|d| d.iter().map(|d| DeviceView { id: d.hash[..8].into(), created: d.created, last_seen: d.last_seen, agent: d.agent.clone() }).collect()).unwrap_or_default()
    }
    /// NW-10: a new single-use code; expired ones are dropped.
    pub fn new_pairing(&self) -> Result<String, String> {
        let code = new_code()?; let mut codes = self.codes.lock().map_err(|e| e.to_string())?;
        codes.retain(|(_, at)| at.elapsed() < CODE_LIFE); codes.push((code.clone(), Instant::now())); Ok(code)
    }
    /// NW-11, NW-14: trades a good code for a device token.
    pub fn pair(&self, peer: IpAddr, code: &str, agent: &str) -> Result<String, String> {
        {
            let mut failures = self.failures.lock().map_err(|e| e.to_string())?;
            let list = failures.entry(peer).or_default(); list.retain(|at| at.elapsed() < Duration::from_secs(60));
            if list.len() >= ATTEMPTS { return Err("Too many attempts; wait a minute".into()); }
        }
        let code = normalize_code(code);
        let found = {
            let mut codes = self.codes.lock().map_err(|e| e.to_string())?;
            codes.retain(|(_, at)| at.elapsed() < CODE_LIFE);
            let index = codes.iter().position(|(c, _)| *c == code);
            index.map(|i| codes.remove(i)).is_some()
        };
        if !found {
            if let Ok(mut failures) = self.failures.lock() { failures.entry(peer).or_default().push(Instant::now()); }
            return Err("This code is wrong or has expired".into());
        }
        let token = new_token()?; let now = now_ms();
        let mut devices = self.devices.lock().map_err(|e| e.to_string())?;
        devices.push(Device { hash: hash(&token), created: now, last_seen: now, agent: agent.chars().take(200).collect() });
        self.save_devices(&devices)?; Ok(token)
    }
    /// NW-12: whether a token belongs to a paired device; its last use is saved at most every ten minutes.
    pub fn check(&self, token: &str) -> bool {
        let h = hash(token); let Ok(mut devices) = self.devices.lock() else { return false };
        let Some(device) = devices.iter_mut().find(|d| d.hash == h) else { return false };
        let now = now_ms();
        if now.saturating_sub(device.last_seen) > 600_000 { device.last_seen = now; let snapshot = devices.clone(); let _ = self.save_devices(&snapshot); }
        true
    }
    /// NW-13: every token stops working at once.
    pub fn forget_all(&self) -> Result<(), String> {
        let mut devices = self.devices.lock().map_err(|e| e.to_string())?; devices.clear(); self.save_devices(&devices)
    }
}
