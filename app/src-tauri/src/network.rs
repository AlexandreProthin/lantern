//! NW-1..5, NW-10..14: Lantern served on the local network, turned on in Settings → Network.
//! The `network_*` commands are the desktop window's only: the server never routes them (NW-21).
pub mod rights;
pub mod devices;
pub mod tls;
pub mod server;
use devices::{Config, DeviceView, Registry};
use serde::Serialize;
use std::{net::{IpAddr, Ipv4Addr, UdpSocket}, sync::{Arc, Mutex}};
use tauri::{AppHandle, Manager, State};
use tokio::sync::watch;

struct Running { port: u16, fingerprint: String, stop: watch::Sender<bool>, shared: Arc<server::Shared> }
pub struct Network { registry: Arc<Registry>, running: Mutex<Option<Running>>, error: Mutex<Option<String>> }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status { enabled: bool, running: bool, port: u16, address: String, url: Option<String>, fingerprint: Option<String>, error: Option<String>, devices: Vec<DeviceView> }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pairing { code: String, url: String, qr: String, expires_in_ms: u64 }

/// This PC's address on the LAN: the one the system would use to reach another network (nothing is sent).
pub fn lan_address() -> IpAddr {
    UdpSocket::bind("0.0.0.0:0").and_then(|s| { s.connect("10.255.255.255:1")?; s.local_addr() }).map(|a| a.ip())
        .ok().filter(|ip| !ip.is_unspecified()).unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST))
}
fn host_name() -> Option<String> { std::env::var("COMPUTERNAME").ok().map(|n| n.to_ascii_lowercase()).filter(|n| tls::usable_name(n)) }
fn url(address: IpAddr, port: u16) -> String { match address { IpAddr::V6(a) => format!("https://[{a}]:{port}/"), a => format!("https://{a}:{port}/") } }

impl Network {
    pub fn new(folder: &std::path::Path) -> Self { Self { registry: Arc::new(Registry::open(folder)), running: Mutex::new(None), error: Mutex::new(None) } }
    fn start(&self, app: &AppHandle, port: u16) -> Result<(), String> {
        self.stop();
        let address = lan_address();
        let mut names = vec![address.to_string(), "localhost".to_string(), "127.0.0.1".to_string()];
        if let Some(h) = host_name() { names.push(h); }
        let identity = tls::identity(self.registry.folder(), &names)?;
        let listener = std::net::TcpListener::bind(("0.0.0.0", port)).map_err(|e| format!("Port {port} is not available: {e}"))?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let (stop, stopped) = watch::channel(false);
        let shared = Arc::new(server::Shared { app: app.clone(), registry: self.registry.clone(), calls: Mutex::default() });
        tauri::async_runtime::spawn(server::serve(listener, identity.config, shared.clone(), stopped));
        *self.running.lock().map_err(|e| e.to_string())? = Some(Running { port, fingerprint: identity.fingerprint, stop, shared });
        Ok(())
    }
    fn stop(&self) {
        if let Some(running) = self.running.lock().ok().and_then(|mut r| r.take()) { running.shared.cancel_all(); let _ = running.stop.send(true); }
    }
    fn status(&self) -> Status {
        let config = self.registry.config(); let address = lan_address();
        let running = self.running.lock().ok();
        let (port, fingerprint) = running.as_ref().and_then(|r| r.as_ref()).map(|r| (r.port, Some(r.fingerprint.clone()))).unwrap_or((config.port, None));
        Status { enabled: config.enabled, running: fingerprint.is_some(), port, address: address.to_string(), url: fingerprint.as_ref().map(|_| url(address, port)),
            fingerprint, error: self.error.lock().ok().and_then(|e| e.clone()), devices: self.registry.devices() }
    }
    fn apply(&self, app: &AppHandle, config: &Config) {
        let result = if config.enabled { self.start(app, config.port) } else { self.stop(); Ok(()) };
        if let Ok(mut error) = self.error.lock() { *error = result.err(); }
    }
}

/// NW-1: the server starts with the app when it was left on.
pub fn launch(app: &AppHandle) -> Result<(), String> {
    let folder = crate::commands::config(app)?.join("network");
    let network = Network::new(&folder); let config = network.registry.config();
    if config.enabled { network.apply(app, &config); }
    app.manage(network); Ok(())
}
/// NW-5: remote generations end with the app.
pub fn shutdown(app: &AppHandle) { if let Some(n) = app.try_state::<Network>() { n.stop(); } }

#[tauri::command]
pub fn network_status(network: State<Network>) -> Status { network.status() }
#[tauri::command]
pub fn network_set(app: AppHandle, enabled: bool, port: u16, network: State<Network>) -> Result<Status, String> {
    if port < 1024 { return Err("Choose a port from 1024 to 65535".into()); }
    let config = Config { enabled, port }; network.registry.save_config(&config)?;
    network.apply(&app, &config); Ok(network.status())
}
/// NW-10: a single-use code, and the link and QR code that carry it in the URL's fragment.
#[tauri::command]
pub fn network_pair(network: State<Network>) -> Result<Pairing, String> {
    let status = network.status(); let base = status.url.ok_or("Lantern is not on the network")?;
    let code = network.registry.new_pairing()?;
    let url = format!("{base}#pair={code}");
    let qr = qrcode::QrCode::new(url.as_bytes()).map_err(|e| e.to_string())?
        .render::<qrcode::render::svg::Color>().min_dimensions(220, 220).quiet_zone(true).build();
    Ok(Pairing { code, url, qr, expires_in_ms: devices::CODE_LIFE.as_millis() as u64 })
}
/// NW-13
#[tauri::command]
pub fn network_forget_devices(network: State<Network>) -> Result<Status, String> { network.registry.forget_all()?; Ok(network.status()) }

#[cfg(test)] mod tests;
