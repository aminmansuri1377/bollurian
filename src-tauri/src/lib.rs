mod admin;
mod price_write_policy;
mod storage;

use admin::AdminSession;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

type AdminState = Arc<Mutex<AdminSession>>;

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<String>, String> {
    storage::load_state(&app)
}

#[tauri::command]
fn save_state(app: AppHandle, payload: String, session_token: Option<String>, admin: State<'_, AdminState>) -> Result<(), String> {
    storage::save_state(&app, &payload, session_token.as_deref(), admin.inner().as_ref())
}

#[tauri::command]
fn save_quote(app: AppHandle, payload: String) -> Result<(), String> {
    storage::save_quote(&app, &payload)
}

#[tauri::command]
fn database_path(app: AppHandle) -> Result<String, String> {
    Ok(storage::database_path(&app)?.display().to_string())
}

#[tauri::command]
async fn unlock_master_prices(password: String, admin: State<'_, AdminState>) -> Result<String, String> {
    let shared = Arc::clone(admin.inner());
    // Password derivation is deliberately expensive; never block the native UI thread.
    tauri::async_runtime::spawn_blocking(move || {
        shared.lock().map_err(|_| "ADMIN_UNAVAILABLE".to_string())?.unlock(&password)
    }).await.map_err(|_| "ADMIN_UNAVAILABLE".to_string())?
}

#[tauri::command]
fn lock_master_prices(session_token: String, admin: State<'_, AdminState>) -> Result<(), String> {
    admin.lock().map_err(|_| "ADMIN_UNAVAILABLE")?.lock(&session_token);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AdminState::default())
        .invoke_handler(tauri::generate_handler![
            load_state, save_state, save_quote, database_path,
            unlock_master_prices, lock_master_prices,
        ])
        .run(tauri::generate_context!())
        .expect("tauri error");
}
