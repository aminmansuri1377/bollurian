/* Build-time password configuration. Nothing is stored as plaintext. */
const { pbkdf2Sync, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { Writable } = require("node:stream");

const ITERATIONS = 600_000;
function normalizePassword(password) {
  return password.replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}
function createVerifier(password, salt = randomBytes(16)) {
  const normalized = normalizePassword(password);
  if ([...normalized].length < 4 || [...normalized].length > 128) {
    throw new Error("Use between 4 and 128 characters (12+ recommended for real use).");
  }
  const base64 = (value) => value.toString("base64").replace(/=+$/, "");
  const digest = pbkdf2Sync(normalized, salt, ITERATIONS, 32, "sha256");
  return `$pbkdf2-sha256$i=${ITERATIONS},l=32$${base64(salt)}$${base64(digest)}`;
}
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run this command in an interactive terminal. Password arguments are intentionally not supported.");
  }
  const silentOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const input = readline.createInterface({ input: process.stdin, output: silentOutput, terminal: true });
  input.on("SIGINT", () => { input.close(); process.stdout.write("\nCancelled.\n"); process.exit(1); });
  const ask = (prompt) => new Promise((resolve) => {
    process.stdout.write(prompt);
    input.question("", (answer) => { process.stdout.write("\n"); resolve(answer); });
  });
  try {
    const password = await ask("New administrator password (hidden): ");
    const confirmation = await ask("Repeat password (hidden): ");
    if (normalizePassword(password) !== normalizePassword(confirmation)) throw new Error("Passwords do not match.");
    const output = path.resolve(__dirname, "../src-tauri/admin-password.json");
    const content = JSON.stringify({ verifier: createVerifier(password) }, null, 2) + "\n";
    const temporary = `${output}.tmp`;
    fs.writeFileSync(temporary, content, { mode: 0o600 });
    fs.renameSync(temporary, output);
    console.log("Password verifier updated. Rebuild and reinstall the desktop app to apply it.");
  } finally { input.close(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { ITERATIONS, createVerifier, normalizePassword };
