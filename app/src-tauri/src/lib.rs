pub mod paths;
pub mod storage;
pub mod provider;
pub mod library;
mod commands;
mod updates;
mod local_feed;
pub mod network;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(commands::StorageLock(std::sync::Mutex::new(())))
        .manage(provider::commands::Calls::default())
        .manage(updates::Pending::default())
        .invoke_handler(tauri::generate_handler![commands::default_library, commands::load_subject,
            commands::save_subject, commands::list_subjects, commands::record_open, commands::read_state,
            commands::save_companion_state, commands::append_amber_log, commands::amber_log_totals,
            commands::delete_subject, commands::subject_thumbnail, commands::reveal_subject, commands::subject_file, commands::import_poc, provider::commands::generate,
            provider::commands::cancel_generation, provider::commands::provider_status, provider::commands::codex_status, provider::commands::endpoint_models, provider::commands::endpoint_model_info,
            provider::commands::set_endpoint_key, provider::commands::endpoint_key_status, provider::commands::remove_endpoint_key,
            commands::load_settings, commands::save_settings, commands::open_external,
            commands::pick_library, commands::validate_library, commands::switch_library, commands::reveal_library, commands::save_window_state, commands::snap_layouts,
            updates::check_update, updates::install_update, updates::release_update,
            network::network_status, network::network_set, network::network_pair, network::network_forget_devices])
        .setup(|app| { network::launch(app.handle())?; Ok(()) })
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") { let _ = window.set_focus(); }
        }))
        .build(tauri::generate_context!())
        .expect("error while running Lantern")
        .run(|app, event| if let tauri::RunEvent::Exit = event { network::shutdown(app) });
}
