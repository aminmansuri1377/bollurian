/** Browser preview ONLY. Not an authorization boundary; production requires native Rust. */
import config from "../../src-tauri/admin-password.json";

let failures = 0;
let blockedUntil = 0;
let attemptQueue: Promise<unknown> = Promise.resolve();

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function verify(password: string): Promise<boolean> {
  const match = /^\$pbkdf2-sha256\$i=(\d+),l=32\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(config.verifier);
  if (!match) throw new Error("ADMIN_CONFIG_INVALID");
  const iterations = Number(match[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 600_000 || iterations > 2_000_000) throw new Error("ADMIN_CONFIG_INVALID");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(match[2]), iterations }, key, 256));
  const expected = decodeBase64(match[3]);
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

export function unlockDevelopmentAdmin(password: string): Promise<string> {
  if (process.env.NODE_ENV !== "development") return Promise.reject(new Error("ADMIN_NATIVE_REQUIRED"));
  const attempt = attemptQueue.catch(() => undefined).then(async () => {
    if (Date.now() < blockedUntil) throw new Error("ADMIN_LOCKED");
    if (blockedUntil !== 0) { blockedUntil = 0; failures = 0; }
    if (!await verify(password)) {
      failures += 1;
      if (failures >= 5) { blockedUntil = Date.now() + 60_000; throw new Error("ADMIN_LOCKED"); }
      throw new Error("ADMIN_BAD_PASSWORD");
    }
    failures = 0;
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("");
  });
  attemptQueue = attempt;
  return attempt;
}
