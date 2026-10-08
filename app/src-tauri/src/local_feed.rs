//! UP-62..UP-66: serve a local release folder to the updater on 127.0.0.1, only while a check or install needs it.
use std::{fs::File, io::{self, BufRead, BufReader, Write}, net::{TcpListener, TcpStream}, path::{Path, PathBuf},
    sync::{atomic::{AtomicBool, Ordering}, Arc}, thread::JoinHandle, time::{Duration, Instant}};
use serde_json::Value;

pub const IDLE: Duration = Duration::from_secs(10 * 60);

/// Reasons a folder cannot be served, as codes the webview maps to its strings (PQ-4).
pub const NO_LATEST: &str = "update-folder:no-latest-json";
pub const NO_INSTALLER_NAMED: &str = "update-folder:no-installer-named";
pub const INSTALLER_MISSING: &str = "update-folder:installer-missing";

pub struct LocalFeed { pub port: u16, pub installer: String, stop: Arc<AtomicBool>, thread: Option<JoinHandle<()>> }

/// The installer file named by `latest.json`'s Windows entry: its URL's last segment, a plain file name.
pub fn installer_name(latest: &Value) -> Option<String> {
    let url = latest["platforms"]["windows-x86_64"]["url"].as_str()?;
    let name = url.rsplit('/').next()?.split(['?', '#']).next()?;
    let plain = !name.is_empty() && name != "." && name != ".." && !name.contains(['\\', ':']);
    plain.then(|| name.to_string())
}

impl LocalFeed {
    pub fn start(folder: &Path, idle: Duration) -> Result<Self, String> {
        let latest: Value = std::fs::read_to_string(folder.join("latest.json")).ok()
            .and_then(|text| serde_json::from_str(&text).ok()).ok_or(NO_LATEST)?;
        let installer = installer_name(&latest).ok_or(NO_INSTALLER_NAMED)?;
        if !folder.join(&installer).is_file() { return Err(INSTALLER_MISSING.into()); }
        let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|e| e.to_string())?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        let stop = Arc::new(AtomicBool::new(false));
        let (flag, root, file) = (stop.clone(), folder.to_path_buf(), installer.clone());
        let thread = std::thread::spawn(move || {
            let mut last = Instant::now();
            while !flag.load(Ordering::Relaxed) && last.elapsed() < idle {
                match listener.accept() {
                    Ok((stream, _)) => { let _ = serve(stream, &root, &file); last = Instant::now(); }
                    Err(e) if e.kind() == io::ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(25)),
                    Err(_) => break,
                }
            }
        });
        Ok(Self { port, installer, stop, thread: Some(thread) })
    }
    pub fn url(&self, path: &str) -> String { format!("http://127.0.0.1:{}/{}", self.port, path) }
}

impl Drop for LocalFeed {
    fn drop(&mut self) { self.stop.store(true, Ordering::Relaxed); if let Some(t) = self.thread.take() { let _ = t.join(); } }
}

fn serve(stream: TcpStream, root: &Path, installer: &str) -> io::Result<()> {
    stream.set_nonblocking(false)?;
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut request = String::new();
    reader.read_line(&mut request)?;
    loop { let mut line = String::new(); if reader.read_line(&mut line)? <= 2 { break; } }
    let mut parts = request.split_whitespace();
    let (method, path) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    let file: Option<(PathBuf, &str)> = match path.trim_start_matches('/') {
        "latest.json" => Some((root.join("latest.json"), "application/json")),
        name if name == installer => Some((root.join(installer), "application/octet-stream")),
        _ => None,
    };
    let mut out = stream;
    match (method, file.and_then(|(p, t)| File::open(p).ok().map(|f| (f, t)))) {
        ("GET", Some((mut f, kind))) => {
            let len = f.metadata()?.len();
            write!(out, "HTTP/1.1 200 OK\r\nContent-Type: {kind}\r\nContent-Length: {len}\r\nConnection: close\r\n\r\n")?;
            io::copy(&mut f, &mut out)?;
        }
        _ => write!(out, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")?,
    }
    out.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Read;
    fn get(port: u16, path: &str) -> String {
        let mut s = TcpStream::connect(("127.0.0.1", port)).unwrap();
        write!(s, "GET {path} HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
        let mut body = String::new(); s.read_to_string(&mut body).unwrap(); body
    }
    fn folder(installer: Option<&str>) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        let latest = json!({"version":"9.9.9","platforms":{"windows-x86_64":{"signature":"s","url":"https://github.com/o/r/releases/download/v9.9.9/Lantern_9.9.9_x64-setup.exe"}}});
        std::fs::write(dir.path().join("latest.json"), latest.to_string()).unwrap();
        if let Some(name) = installer { std::fs::write(dir.path().join(name), b"INSTALLER").unwrap(); }
        dir
    }
    #[test]
    fn installer_name_is_a_plain_file_name() {
        let named = |url: &str| installer_name(&json!({"platforms":{"windows-x86_64":{"url":url}}}));
        assert_eq!(named("https://x/a/Lantern_0.1.5_x64-setup.exe").as_deref(), Some("Lantern_0.1.5_x64-setup.exe"));
        assert_eq!(named("https://x/a/"), None);
        assert_eq!(named("https://x/..").as_deref(), None);
        assert_eq!(named("C:\\evil.exe"), None);
        assert_eq!(installer_name(&json!({})), None);
    }
    #[test]
    fn up63_serves_only_latest_and_the_named_installer_then_stops() {
        let dir = folder(Some("Lantern_9.9.9_x64-setup.exe"));
        std::fs::write(dir.path().join("secret.txt"), b"no").unwrap();
        let feed = LocalFeed::start(dir.path(), IDLE).unwrap();
        let port = feed.port;
        assert!(get(port, "/latest.json").contains("\"9.9.9\""));
        assert!(get(port, "/Lantern_9.9.9_x64-setup.exe").ends_with("INSTALLER"));
        assert!(get(port, "/secret.txt").starts_with("HTTP/1.1 404"));
        assert!(get(port, "/../latest.json").starts_with("HTTP/1.1 404"));
        assert_eq!(feed.url("latest.json"), format!("http://127.0.0.1:{port}/latest.json"));
        drop(feed);
        assert!(TcpStream::connect(("127.0.0.1", port)).is_err());
    }
    #[test]
    fn up63_stops_by_itself_when_idle() {
        let dir = folder(Some("Lantern_9.9.9_x64-setup.exe"));
        let feed = LocalFeed::start(dir.path(), Duration::from_millis(100)).unwrap();
        std::thread::sleep(Duration::from_millis(400));
        assert!(TcpStream::connect(("127.0.0.1", feed.port)).is_err());
    }
    #[test]
    fn up66_reports_why_a_folder_cannot_be_served() {
        let empty = tempfile::tempdir().unwrap();
        assert_eq!(LocalFeed::start(empty.path(), IDLE).err().as_deref(), Some(NO_LATEST));
        assert_eq!(LocalFeed::start(folder(None).path(), IDLE).err().as_deref(), Some(INSTALLER_MISSING));
        let unnamed = tempfile::tempdir().unwrap();
        std::fs::write(unnamed.path().join("latest.json"), "{\"version\":\"1.0.0\"}").unwrap();
        assert_eq!(LocalFeed::start(unnamed.path(), IDLE).err().as_deref(), Some(NO_INSTALLER_NAMED));
    }
}
