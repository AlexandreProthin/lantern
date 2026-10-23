//! DC-41, DC-42, DC-44: the debug console's log files. Rust writes them: only `.md` names of the
//! `lantern-debug-YYYY-MM-DD-HHMMSS.md` shape, only directly inside an existing, absolute log folder.
//! Not in the network allowlist (NW-20): a remote device can never call it (DC-3).
use std::{fs::OpenOptions, io::Write, path::{Path, PathBuf}};

/// DC-41/DC-42: exactly `lantern-debug-YYYY-MM-DD-HHMMSS.md`, so no separator, `..` or other extension can pass.
pub fn valid_name(name: &str) -> bool {
    let Some(stem) = name.strip_prefix("lantern-debug-").and_then(|rest| rest.strip_suffix(".md")) else { return false };
    let bytes = stem.as_bytes();
    bytes.len() == 17 && bytes.iter().enumerate().all(|(i, c)| match i { 4 | 7 | 10 => *c == b'-', _ => c.is_ascii_digit() })
}

/// DC-44: the folder must be absolute and exist.
pub fn check_folder(folder: &Path) -> Result<(), String> {
    if !folder.is_absolute() { return Err("The log folder must be an absolute path".into()); }
    if !folder.is_dir() { return Err("The log folder does not exist".into()); }
    Ok(())
}

/// The file the name points at, directly inside the folder; an existing non-file (folder, link) is refused.
pub fn target(folder: &Path, name: &str) -> Result<PathBuf, String> {
    check_folder(folder)?;
    if !valid_name(name) { return Err("Not a debug log file name".into()); }
    let path = folder.join(name);
    if path.parent() != Some(folder) { return Err("The log file must be inside the log folder".into()); }
    if let Ok(meta) = std::fs::symlink_metadata(&path) { if !meta.is_file() { return Err("The log file name is taken by something else".into()); } }
    Ok(path)
}

/// DC-41: `append == false` creates a new file (never overwrites); DC-42: `append == true` creates or appends.
pub fn write(folder: &Path, name: &str, text: &str, append: bool) -> Result<PathBuf, String> {
    let path = target(folder, name)?;
    let mut options = OpenOptions::new();
    if append { options.create(true).append(true); } else { options.write(true).create_new(true); }
    let mut file = options.open(&path).map_err(|e| format!("Could not open {}: {e}", path.display()))?;
    file.write_all(text.as_bytes()).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(path)
}

#[tauri::command]
pub fn debug_log_write(folder: PathBuf, name: String, text: String, append: bool) -> Result<PathBuf, String> { write(&folder, &name, &text, append) }

#[cfg(test)]
mod tests {
    use super::*;
    const NAME: &str = "lantern-debug-2026-10-23-140502.md";

    #[test]
    fn debug_log_names() {
        assert!(valid_name(NAME));
        for bad in ["", "lantern-debug-.md", "lantern-debug-2026-10-23-14050.md", "lantern-debug-2026-10-23-1405022.md", "lantern-debug-2026-10-23-140502.txt",
            "lantern-debug-2026-10-23-140502.md.exe", "x-lantern-debug-2026-10-23-140502.md", "lantern-debug-2026/10-23-140502.md", "lantern-debug-2026-10-23-14050a.md",
            "lantern-debug-2026_10-23-140502.md", "../lantern-debug-2026-10-23-140502.md", "..\\lantern-debug-2026-10-23-140502.md", "lantern-debug-2026-10-23-140502.MD",
            "lantern-debug-２026-10-23-140502.md", "LANTERN-DEBUG-2026-10-23-140502.md"] {
            assert!(!valid_name(bad), "{bad}");
        }
    }

    #[test]
    fn debug_log_folder_checks() {
        let dir = tempfile::tempdir().unwrap();
        assert!(check_folder(dir.path()).is_ok());
        assert!(check_folder(Path::new("relative/folder")).is_err());
        assert!(check_folder(&dir.path().join("missing")).is_err());
        let file = dir.path().join("plain.txt"); std::fs::write(&file, "x").unwrap();
        assert!(check_folder(&file).is_err());
        assert!(target(dir.path(), "../lantern-debug-2026-10-23-140502.md").is_err());
        std::fs::create_dir(dir.path().join(NAME)).unwrap();
        assert!(target(dir.path(), NAME).is_err(), "a folder with the log's name is not a log file");
    }

    #[test]
    fn debug_log_write_and_append() {
        let dir = tempfile::tempdir().unwrap();
        let path = write(dir.path(), NAME, "# head\n", true).unwrap();
        assert_eq!(path, dir.path().join(NAME));
        write(dir.path(), NAME, "## one\n", true).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "# head\n## one\n");
        assert!(write(dir.path(), NAME, "again", false).is_err(), "Save never overwrites");
        let saved = write(dir.path(), "lantern-debug-2026-10-23-140503.md", "all", false).unwrap();
        assert_eq!(std::fs::read_to_string(saved).unwrap(), "all");
        assert!(write(dir.path(), "notes.md", "x", true).is_err());
        assert!(write(&dir.path().join("missing"), NAME, "x", true).is_err());
    }

    #[test]
    fn debug_log_is_not_remote() { assert!(!crate::network::rights::allowed("debug_log_write")); }
}
