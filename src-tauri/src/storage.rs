//! Existing SQLite schema and location, with a transactional master-price write check.
use crate::{admin::AdminSession, price_write_policy::changes_master_prices};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::Value;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

pub fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("bollourian.db"))
}

fn connect(app: &AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY AUTOINCREMENT,
           created_at TEXT DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL);"
    ).map_err(|error| error.to_string())?;
    Ok(connection)
}

fn read_state(connection: &Connection) -> Result<Option<String>, String> {
    connection.query_row("SELECT value FROM state WHERE key='main'", [], |row| row.get(0))
        .optional().map_err(|error| error.to_string())
}

pub fn load_state(app: &AppHandle) -> Result<Option<String>, String> {
    read_state(&connect(app)?)
}

pub fn save_state(app: &AppHandle, payload: &str, token: Option<&str>, admin: &Mutex<AdminSession>) -> Result<(), String> {
    persist_state(&mut connect(app)?, payload, token, admin)
}

fn persist_state(connection: &mut Connection, payload: &str, token: Option<&str>, admin: &Mutex<AdminSession>) -> Result<(), String> {
    let next: Value = serde_json::from_str(payload).map_err(|_| "INVALID_STATE")?;
    let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let old_raw = read_state(&transaction)?;
    let previous: Option<Value> = old_raw.as_deref().map(serde_json::from_str).transpose()
        .map_err(|_| "SAVED_STATE_INVALID")?;
    if changes_master_prices(previous.as_ref(), &next)? {
        admin.lock().map_err(|_| "ADMIN_UNAVAILABLE")?.require(token)?;
    }
    // The original payload is kept: no changes to the application's formulas or settings schema.
    transaction.execute(
        "INSERT INTO state(key,value) VALUES('main',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![payload],
    ).map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub fn save_quote(app: &AppHandle, payload: &str) -> Result<(), String> {
    connect(app)?.execute("INSERT INTO quotes(payload) VALUES(?1)", params![payload])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn memory_database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch("CREATE TABLE state(key TEXT PRIMARY KEY,value TEXT NOT NULL);").unwrap();
        connection
    }
    #[test]
    fn unauthorized_changes_are_not_written() {
        let mut connection = memory_database();
        let admin = Mutex::new(AdminSession::default());
        let original = r#"{"prices":{},"previousPrices":{},"stops":3}"#;
        persist_state(&mut connection, original, None, &admin).unwrap();
        let changed = r#"{"prices":{"motor|ABB":1234},"previousPrices":{},"stops":3}"#;
        assert_eq!(persist_state(&mut connection, changed, None, &admin).unwrap_err(), "ADMIN_REQUIRED");
        assert_eq!(read_state(&connection).unwrap().as_deref(), Some(original));
        let token = admin.lock().unwrap().unlock("1111").unwrap();
        persist_state(&mut connection, changed, Some(&token), &admin).unwrap();
        assert_eq!(read_state(&connection).unwrap().as_deref(), Some(changed));
        admin.lock().unwrap().lock(&token);
        assert!(persist_state(&mut connection, original, Some(&token), &admin).is_err());
        assert_eq!(read_state(&connection).unwrap().as_deref(), Some(changed));
    }
    #[test]
    fn changing_customer_stops_capacity_and_rails_stays_unlocked() {
        let mut connection = memory_database();
        let admin = Mutex::new(AdminSession::default());
        let token = admin.lock().unwrap().unlock("1111").unwrap();
        persist_state(&mut connection, r#"{"prices":{"A":1000},"stops":3}"#, Some(&token), &admin).unwrap();
        admin.lock().unwrap().lock(&token);
        let changed = r#"{"prices":{"A":1000},"stops":10,"capacity":"8","railTypes":["T9","T16"],"customer":"Test"}"#;
        persist_state(&mut connection, changed, None, &admin).unwrap();
        assert_eq!(read_state(&connection).unwrap().as_deref(), Some(changed));
    }
}
