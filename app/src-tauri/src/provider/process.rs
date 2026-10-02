use std::{path::Path, process::{Child, Command}};
pub fn command(executable: &Path) -> Command {
    let mut cmd = if executable.extension().is_some_and(|e| e.eq_ignore_ascii_case("cmd")) {
        let mut cmd = Command::new("cmd.exe"); cmd.args(["/D", "/S", "/C"]).arg(executable); cmd
    } else { Command::new(executable) };
    #[cfg(windows)] { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    cmd
}
#[cfg(windows)]
pub struct ProcessTree(windows_sys::Win32::Foundation::HANDLE);
#[cfg(windows)]
impl ProcessTree {
    pub fn attach(child: &Child) -> Result<Self, String> {
        use std::os::windows::io::AsRawHandle;
        use windows_sys::Win32::{Foundation::CloseHandle, System::JobObjects::*};
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() { return Err(std::io::Error::last_os_error().to_string()); }
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let success = unsafe { SetInformationJobObject(handle, JobObjectExtendedLimitInformation, &limits as *const _ as *const _, std::mem::size_of_val(&limits) as u32) != 0
            && AssignProcessToJobObject(handle, child.as_raw_handle()) != 0 };
        if !success { let e = std::io::Error::last_os_error(); unsafe { CloseHandle(handle); } return Err(e.to_string()); }
        Ok(Self(handle))
    }
    pub fn kill(&self) { unsafe { windows_sys::Win32::System::JobObjects::TerminateJobObject(self.0, 1); } }
    #[cfg(test)]
    pub fn active_processes(&self) -> u32 {
        use windows_sys::Win32::System::JobObjects::*;
        let mut info: JOBOBJECT_BASIC_ACCOUNTING_INFORMATION = unsafe { std::mem::zeroed() };
        let ok = unsafe { QueryInformationJobObject(self.0, JobObjectBasicAccountingInformation, &mut info as *mut _ as *mut _, std::mem::size_of_val(&info) as u32, std::ptr::null_mut()) };
        assert_ne!(ok, 0); info.ActiveProcesses
    }
}
#[cfg(windows)] impl Drop for ProcessTree { fn drop(&mut self) { unsafe { windows_sys::Win32::Foundation::CloseHandle(self.0); } } }
#[cfg(not(windows))]
pub struct ProcessTree;
#[cfg(not(windows))]
impl ProcessTree { pub fn attach(_: &Child) -> Result<Self, String> { Ok(Self) } pub fn kill(&self) {} }
