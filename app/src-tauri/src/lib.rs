pub mod paths;
pub mod storage;
pub mod provider;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") { let _ = window.set_focus(); }
        }))
        .run(tauri::generate_context!())
        .expect("error while running Lantern");
}
