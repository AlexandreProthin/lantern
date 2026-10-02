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

#[cfg(windows)]
pub fn open_external(url: &str) -> Result<(), String> {
    use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};
    if url.len() > 10000 || !["http://", "https://", "mailto:"].iter().any(|prefix| url.to_lowercase().starts_with(prefix)) { return Err("Unsupported link scheme".into()); }
    let op: Vec<u16> = "open".encode_utf16().chain([0]).collect(); let file: Vec<u16> = url.encode_utf16().chain([0]).collect();
    let result = unsafe { ShellExecuteW(std::ptr::null_mut(), op.as_ptr(), file.as_ptr(), std::ptr::null(), std::ptr::null(), SW_SHOWNORMAL) };
    if result as isize <= 32 { return Err("Could not open external link".into()); } Ok(())
}
#[cfg(not(windows))]
pub fn open_external(_: &str) -> Result<(), String> { Err("External link opening is only supported on Windows".into()) }

#[cfg(windows)]
pub fn pick_folder(caption:&str) -> Result<Option<PathBuf>, String> {
    use windows_sys::Win32::{System::Com::{CoInitializeEx, CoUninitialize, CoTaskMemFree, COINIT_APARTMENTTHREADED}, UI::Shell::{SHBrowseForFolderW, SHGetPathFromIDListW, BROWSEINFOW, BIF_RETURNONLYFSDIRS, BIF_NEWDIALOGSTYLE}};
    let initialized = unsafe { CoInitializeEx(std::ptr::null(), COINIT_APARTMENTTHREADED as u32) };
    if initialized < 0 { return Err("Could not initialize folder picker".into()); }
    let title: Vec<u16> = caption.encode_utf16().chain([0]).collect();
    let mut display = [0u16;260];
    let info = BROWSEINFOW { pszDisplayName:display.as_mut_ptr(), lpszTitle:title.as_ptr(), ulFlags:BIF_RETURNONLYFSDIRS|BIF_NEWDIALOGSTYLE, ..Default::default() };
    let item = unsafe { SHBrowseForFolderW(&info) };
    let result = if item.is_null() { Ok(None) } else {
        let mut path = [0u16;32768]; let valid = unsafe { SHGetPathFromIDListW(item,path.as_mut_ptr()) };
        unsafe { CoTaskMemFree(item as *const _) };
        if valid == 0 { Err("Choose a filesystem folder".into()) } else { Ok(Some(PathBuf::from(String::from_utf16_lossy(&path[..path.iter().position(|&c|c==0).unwrap_or(path.len())])))) }
    };
    unsafe { CoUninitialize() }; result
}
#[cfg(not(windows))]
pub fn pick_folder(_: &str) -> Result<Option<PathBuf>, String> { Err("Folder picker is only supported on Windows".into()) }
#[cfg(windows)]
pub fn reveal_folder(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::{Shell::ShellExecuteW,WindowsAndMessaging::SW_SHOWNORMAL};
    let path=std::fs::canonicalize(path).map_err(|e|e.to_string())?;
    if !path.is_dir() { return Err("Folder is unavailable".into()); }
    let file: Vec<u16> = path.as_os_str().encode_wide().chain([0]).collect();
    let op: Vec<u16> = "open".encode_utf16().chain([0]).collect();
    let result=unsafe {ShellExecuteW(std::ptr::null_mut(),op.as_ptr(),file.as_ptr(),std::ptr::null(),std::ptr::null(),SW_SHOWNORMAL)};
    if result as isize <= 32 { return Err("Could not reveal library".into()); } Ok(())
}
#[cfg(not(windows))]
pub fn reveal_folder(_: &Path) -> Result<(), String> { Err("Explorer is only supported on Windows".into()) }
