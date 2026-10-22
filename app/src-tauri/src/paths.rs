//! OS-specific paths and file operations (PQ-2).
use std::path::{Path, PathBuf};

/// Disk paths shown to the user or stored in settings: canonical, without the Windows `\\?\` verbatim prefix.
pub fn canonical(path: &Path) -> std::io::Result<PathBuf> { dunce::canonicalize(path) }
/// Normalises an already-stored path string (heals `\\?\C:\...` values from earlier builds).
pub fn plain_path(path: &str) -> String { dunce::simplified(Path::new(path)).to_string_lossy().into_owned() }
/// Files in `subjects/` whose stem is not a valid subject id are foreign: left alone, never listed, never an error.
pub fn is_subject_id(id: &str) -> bool { check_id(id).is_ok() }
fn check_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 128 || !id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        || id.starts_with('-') || id.ends_with('-') || id.contains("--") { return Err("Invalid subject id".into()); }
    let upper = id.to_ascii_uppercase();
    if ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"].contains(&upper.as_str()) { return Err("Reserved subject id".into()); }
    Ok(())
}
pub fn subject_path(library: &Path, id: &str) -> Result<PathBuf, String> {
    check_id(id)?;
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
    let path = canonical(path).map_err(|e| e.to_string())?;
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
/// File Explorer-style folder picker (IFileOpenDialog + FOS_PICKFOLDERS), starting in `start` when it is a folder.
pub fn pick_folder(caption:&str, start:Option<&Path>) -> Result<Option<PathBuf>, String> {
    use windows::{core::{HSTRING,PCWSTR},Win32::{Foundation::ERROR_CANCELLED,System::Com::{CoCreateInstance,CoInitializeEx,CoTaskMemFree,CoUninitialize,CLSCTX_INPROC_SERVER,COINIT_APARTMENTTHREADED},UI::Shell::{FileOpenDialog,IFileOpenDialog,IShellItem,SHCreateItemFromParsingName,FOS_FORCEFILESYSTEM,FOS_PICKFOLDERS,SIGDN_FILESYSPATH}}};
    let initialized = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    if initialized.is_err() { return Err("Could not initialize folder picker".into()); }
    let result = (|| -> windows::core::Result<Option<PathBuf>> { unsafe {
        let dialog: IFileOpenDialog = CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER)?;
        dialog.SetOptions(dialog.GetOptions()? | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM)?;
        dialog.SetTitle(&HSTRING::from(caption))?;
        if let Some(folder) = start.filter(|p| p.is_dir()) {
            if let Ok(item) = SHCreateItemFromParsingName::<_, _, IShellItem>(PCWSTR(HSTRING::from(folder.as_os_str()).as_ptr()), None) { let _ = dialog.SetFolder(&item); }
        }
        match dialog.Show(None) { Err(e) if e.code() == ERROR_CANCELLED.to_hresult() => return Ok(None), other => other? }
        let item = dialog.GetResult()?; let name = item.GetDisplayName(SIGDN_FILESYSPATH)?;
        let path = PathBuf::from(String::from_utf16_lossy(name.as_wide())); CoTaskMemFree(Some(name.0 as *const _)); Ok(Some(path))
    } })();
    unsafe { CoUninitialize() }; result.map_err(|e| e.message())
}
#[cfg(not(windows))]
pub fn pick_folder(_: &str, _: Option<&Path>) -> Result<Option<PathBuf>, String> { Err("Folder picker is only supported on Windows".into()) }
#[cfg(windows)]
pub fn reveal_folder(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::{Shell::ShellExecuteW,WindowsAndMessaging::SW_SHOWNORMAL};
    let path=canonical(path).map_err(|e|e.to_string())?;
    if !path.is_dir() { return Err("Folder is unavailable".into()); }
    let file: Vec<u16> = path.as_os_str().encode_wide().chain([0]).collect();
    let op: Vec<u16> = "open".encode_utf16().chain([0]).collect();
    let result=unsafe {ShellExecuteW(std::ptr::null_mut(),op.as_ptr(),file.as_ptr(),std::ptr::null(),std::ptr::null(),SW_SHOWNORMAL)};
    if result as isize <= 32 { return Err("Could not reveal library".into()); } Ok(())
}
#[cfg(not(windows))]
pub fn reveal_folder(_: &Path) -> Result<(), String> { Err("Explorer is only supported on Windows".into()) }
#[cfg(windows)]
pub fn reveal_file(path: &Path) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    let path=canonical(path).map_err(|e|e.to_string())?;
    if !path.is_file() {return Err("Subject file is unavailable".into());}
    let path=path.to_string_lossy().trim_start_matches(r"\\?\").to_string();
    std::process::Command::new("explorer.exe").raw_arg(format!("/select,\"{path}\""))
        .creation_flags(0x08000000).spawn().map_err(|e|e.to_string())?;
    Ok(())
}
#[cfg(not(windows))]
pub fn reveal_file(_: &Path) -> Result<(), String> {Err("Explorer is only supported on Windows".into())}
/// The frameless window has no system maximize button for Windows 11 to hang its Snap Layouts
/// flyout on, so hovering the header's own button sends Win+Z, which opens it for the foreground window.
#[cfg(windows)]
pub fn snap_layouts() {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_LWIN, VIRTUAL_KEY};
    let key=|vk:VIRTUAL_KEY,flags| INPUT{r#type:INPUT_KEYBOARD,Anonymous:INPUT_0{ki:KEYBDINPUT{wVk:vk,wScan:0,dwFlags:flags,time:0,dwExtraInfo:0}}};
    let z=b'Z' as VIRTUAL_KEY;
    let inputs=[key(VK_LWIN,0),key(z,0),key(z,KEYEVENTF_KEYUP),key(VK_LWIN,KEYEVENTF_KEYUP)];
    unsafe { SendInput(inputs.len() as u32,inputs.as_ptr(),std::mem::size_of::<INPUT>() as i32); }
}
#[cfg(not(windows))]
pub fn snap_layouts() {}
