use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};
use std::{fs, path::PathBuf};
fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
 let dir=app.path().app_data_dir().map_err(|e|e.to_string())?;
 fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
 Ok(dir.join("bollourian.db"))
}
fn db(app:&AppHandle)->Result<Connection,String>{
 let c=Connection::open(db_path(app)?).map_err(|e|e.to_string())?;
 c.execute_batch("CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL);").map_err(|e|e.to_string())?;
 Ok(c)
}
#[tauri::command]
fn load_state(app:AppHandle)->Result<Option<String>,String>{
 let c=db(&app)?;
 match c.query_row("SELECT value FROM state WHERE key='main'",[],|r|r.get::<_,String>(0)){
  Ok(s)=>Ok(Some(s)),Err(rusqlite::Error::QueryReturnedNoRows)=>Ok(None),Err(e)=>Err(e.to_string())
 }
}
#[tauri::command]
fn save_state(app:AppHandle,payload:String)->Result<(),String>{
 let c=db(&app)?;
 c.execute("INSERT INTO state(key,value) VALUES('main',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![payload]).map_err(|e|e.to_string())?;
 Ok(())
}
#[tauri::command]
fn save_quote(app:AppHandle,payload:String)->Result<(),String>{
 let c=db(&app)?;
 c.execute("INSERT INTO quotes(payload) VALUES(?1)",params![payload]).map_err(|e|e.to_string())?;
 Ok(())
}
#[tauri::command]
fn database_path(app:AppHandle)->Result<String,String>{Ok(db_path(&app)?.display().to_string())}
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){tauri::Builder::default().invoke_handler(tauri::generate_handler![load_state,save_state,save_quote,database_path]).run(tauri::generate_context!()).expect("tauri error")}
