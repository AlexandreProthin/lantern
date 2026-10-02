//! OS-specific paths and file operations (PQ-2).
use std::path::{Path, PathBuf};

pub fn subject_path(library: &Path, id: &str) -> Result<PathBuf, String> {
    if id.is_empty() || id.len() > 128 || !id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        || id.starts_with('-') || id.ends_with('-') || id.contains("--") { return Err("Invalid subject id".into()); }
    let upper = id.to_ascii_uppercase();
    if ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"].contains(&upper.as_str()) { return Err("Reserved subject id".into()); }
    let folder = library.join("subjects"); reject_link(&folder)?;
    let path = folder.join(format!("{id}.json")); reject_link(&path)?; Ok(path)
}
pub fn reject_link(path: &Path) -> Result<(), String> {
    if let Ok(meta) = std::fs::symlink_metadata(path) {
        if meta.file_type().is_symlink() { return Err("Library file must not be a symbolic link".into()); }
        #[cfg(windows)] {
            use std::os::windows::fs::MetadataExt;
            if meta.file_attributes() & 0x400 != 0 { return Err("Library file must not be a reparse point".into()); }
        }
    }
    Ok(())
}
#[cfg(windows)]
pub fn recycle_file(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::{SHFileOperationW, SHFILEOPSTRUCTW, FO_DELETE, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT};
    let path = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    let display = path.to_string_lossy().trim_start_matches(r"\\?\").to_string();
    let from: Vec<u16> = std::ffi::OsStr::new(&display).encode_wide().chain([0, 0]).collect();
    let mut op: SHFILEOPSTRUCTW = unsafe { std::mem::zeroed() };
    op.wFunc = FO_DELETE; op.pFrom = from.as_ptr();
    op.fFlags = (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT) as u16;
    let result = unsafe { SHFileOperationW(&mut op) };
    if result != 0 || op.fAnyOperationsAborted != 0 { return Err(format!("Recycle Bin operation failed ({result})")); }
    Ok(())
}
#[cfg(not(windows))]
pub fn recycle_file(_: &Path) -> Result<(), String> { Err("Recycle Bin is only supported on Windows".into()) }
