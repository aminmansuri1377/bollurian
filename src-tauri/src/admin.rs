//! Local administrator session. No pricing formulas and no database migrations.
use pbkdf2::{password_hash::{PasswordHash, PasswordVerifier}, Pbkdf2};
use rand_core::{OsRng, RngCore};
use serde::Deserialize;
use std::time::{Duration, Instant};

const ATTEMPT_LIMIT: u8 = 5;
const COOLDOWN: Duration = Duration::from_secs(60);
#[cfg(not(test))]
const PASSWORD_CONFIG: &str = include_str!("../admin-password.json");
#[cfg(test)]
const PASSWORD_CONFIG: &str = include_str!("../tests/fixtures/admin-password.json");

#[derive(Deserialize)]
struct PasswordConfig { verifier: String }

#[derive(Default)]
pub struct AdminSession {
    token: Option<String>,
    failed_attempts: u8,
    locked_until: Option<Instant>,
}

fn normalize_password(password: &str) -> String {
    password.chars().map(|ch| match ch {
        '\u{06f0}'..='\u{06f9}' => char::from(b'0' + (ch as u32 - 0x06f0) as u8),
        '\u{0660}'..='\u{0669}' => char::from(b'0' + (ch as u32 - 0x0660) as u8),
        _ => ch,
    }).collect()
}

fn password_matches(password: &str) -> Result<bool, String> {
    if password.chars().count() > 128 { return Ok(false); }
    let config: PasswordConfig = serde_json::from_str(PASSWORD_CONFIG).map_err(|_| "ADMIN_CONFIG_INVALID")?;
    let hash = PasswordHash::new(&config.verifier).map_err(|_| "ADMIN_CONFIG_INVALID")?;
    match Pbkdf2.verify_password(normalize_password(password).as_bytes(), &hash) {
        Ok(()) => Ok(true),
        Err(pbkdf2::password_hash::Error::Password) => Ok(false),
        Err(_) => Err("ADMIN_CONFIG_INVALID".into()),
    }
}

impl AdminSession {
    pub fn unlock(&mut self, password: &str) -> Result<String, String> {
        self.unlock_at(password, Instant::now())
    }

    fn unlock_at(&mut self, password: &str, now: Instant) -> Result<String, String> {
        if let Some(until) = self.locked_until {
            if now < until { return Err("ADMIN_LOCKED".into()); }
            self.locked_until = None;
            self.failed_attempts = 0;
        }
        if !password_matches(password)? {
            self.failed_attempts += 1;
            if self.failed_attempts >= ATTEMPT_LIMIT {
                self.locked_until = Some(now + COOLDOWN);
                return Err("ADMIN_LOCKED".into());
            }
            return Err("ADMIN_BAD_PASSWORD".into());
        }
        let mut random = [0u8; 32];
        OsRng.try_fill_bytes(&mut random).map_err(|_| "ADMIN_UNAVAILABLE")?;
        let token = random.iter().map(|byte| format!("{byte:02x}")).collect::<String>();
        self.failed_attempts = 0;
        self.locked_until = None;
        self.token = Some(token.clone());
        Ok(token)
    }

    pub fn require(&self, token: Option<&str>) -> Result<(), String> {
        match (&self.token, token) {
            (Some(expected), Some(actual)) if expected == actual => Ok(()),
            _ => Err("ADMIN_REQUIRED".into()),
        }
    }

    pub fn lock(&mut self, token: &str) {
        // A cancelled/stale login must not revoke a newer session.
        if self.token.as_deref() == Some(token) { self.token = None; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn default_password_and_localized_digits() {
        assert!(password_matches("1111").unwrap());
        assert!(password_matches("\u{06f1}\u{06f1}\u{06f1}\u{06f1}").unwrap());
        assert!(password_matches("\u{0661}\u{0661}\u{0661}\u{0661}").unwrap());
        assert!(!password_matches("1112").unwrap());
        assert!(!password_matches(" 1111").unwrap());
    }
    #[test]
    fn token_is_required_rotated_and_revoked() {
        let mut session = AdminSession::default();
        assert!(session.require(None).is_err());
        let first = session.unlock("1111").unwrap();
        assert_eq!(first.len(), 64);
        assert!(session.require(Some(&first)).is_ok());
        let second = session.unlock("1111").unwrap();
        assert_ne!(first, second);
        session.lock(&first);
        assert!(session.require(Some(&second)).is_ok());
        assert!(session.require(Some(&first)).is_err());
        session.lock(&second);
        assert!(session.require(Some(&second)).is_err());
    }
    #[test]
    fn rate_limit_survives_dialog_reopen() {
        let now = Instant::now();
        let mut session = AdminSession::default();
        for _ in 0..4 { assert_eq!(session.unlock_at("wrong", now).unwrap_err(), "ADMIN_BAD_PASSWORD"); }
        assert_eq!(session.unlock_at("wrong", now).unwrap_err(), "ADMIN_LOCKED");
        assert_eq!(session.unlock_at("1111", now + Duration::from_secs(59)).unwrap_err(), "ADMIN_LOCKED");
        assert!(session.unlock_at("1111", now + Duration::from_secs(60)).is_ok());
    }
}
