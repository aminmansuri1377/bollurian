/* Isolated tests for access control and the existing save transport, not pricing formulas. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const ts = require("typescript");
const { createVerifier, normalizePassword, ITERATIONS } = require("./set-admin-password.cjs");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "bollurian-admin-"));
const originalEnvironment = process.env.NODE_ENV;
const tokenA = "a".repeat(64), tokenB = "b".repeat(64);
let nativeHandler = async () => undefined;
let nativeCalls = [];
const stubCore = path.join(temp, "node_modules/@tauri-apps/api");
fs.mkdirSync(stubCore, { recursive: true });
fs.writeFileSync(path.join(stubCore, "core.js"), "exports.invoke = (...args) => global.__adminTestInvoke(...args);");
global.__adminTestInvoke = async (command, args) => { nativeCalls.push({ command, args }); return nativeHandler(command, args); };

const sources = ["lib/price-manager/admin-session.ts", "lib/admin/access.ts", "lib/admin/development-access.ts", "lib/admin/messages.ts", "lib/price-manager/persistence.ts", "hooks/use-master-price-access.ts"];
for (const relative of sources) {
  const destination = path.join(temp, relative.replace(/\.ts$/, ".js"));
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: relative, reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, compiled.outputText);
}
fs.mkdirSync(path.join(temp, "src-tauri"));
fs.copyFileSync(path.join(root, "src-tauri/tests/fixtures/admin-password.json"), path.join(temp, "src-tauri/admin-password.json"));
// These two stubs deliberately isolate persistence. They do not pretend to test business rules.
fs.writeFileSync(path.join(temp, "lib/price-manager/constants.js"), 'exports.INITIAL_SETTINGS={prices:{},previousPrices:{}};exports.STORAGE_KEY="test-settings";');
fs.writeFileSync(path.join(temp, "lib/price-manager/settings.js"), 'exports.isRecord=v=>typeof v==="object"&&v!==null;exports.parseSettings=v=>v;');
const session = require(path.join(temp, "lib/price-manager/admin-session.js"));
const access = require(path.join(temp, "lib/admin/access.js"));
const persistence = require(path.join(temp, "lib/price-manager/persistence.js"));
const messages = require(path.join(temp, "lib/admin/messages.js"));

function verifyWithNode(password, verifier) {
  const match = /^\$pbkdf2-sha256\$i=(\d+),l=32\$([^$]+)\$([^$]+)$/.exec(verifier);
  assert.ok(match);
  const actual = crypto.pbkdf2Sync(normalizePassword(password), Buffer.from(match[2], "base64"), Number(match[1]), 32, "sha256");
  return crypto.timingSafeEqual(actual, Buffer.from(match[3], "base64"));
}
const initial = () => ({ prices: { "M001|brand": 1000 }, previousPrices: {}, customer: "client", stops: 10, capacity: "8", railTypes: ["T9", "T16.T89"] });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

/* A deterministic hook unit harness. This is NOT a substitute for a real React/WebView UI test. */
function hookHarness(overrides = {}) {
  let cursor = 0, dirty = true, result, mounted = true;
  const slots = [], effects = [], cleanups = [];
  const hookReact = {
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; dirty = true; }];
    },
    useRef(value) { const index = cursor++; if (!(index in slots)) slots[index] = { current: value }; return slots[index]; },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => value !== previous[i])) {
        slots[index] = deps; effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
  };
  let props = { action: "prices", settings: initial(), onClose() {}, onResetDemo() {}, ...overrides };
  const hookModule = { exports: {} };
  const requireHook = (name) => name === "react" ? hookReact : name.startsWith("@/") ? require(path.join(temp, `${name.slice(2)}.js`)) : require(name);
  new Function("require", "module", "exports", fs.readFileSync(path.join(temp, "hooks/use-master-price-access.js"), "utf8"))(requireHook, hookModule, hookModule.exports);
  function render() {
    let guard = 0;
    while (dirty && mounted) {
      assert.ok(guard++ < 30, "Hook must settle without an effect loop");
      dirty = false; cursor = 0; result = hookModule.exports.useMasterPriceAccess(props);
      while (effects.length) effects.shift()();
    }
    return result;
  }
  return {
    render,
    setProps(patch) { props = { ...props, ...patch }; dirty = true; return render(); },
    async settle() { for (let i = 0; i < 6; i += 1) { render(); await new Promise(setImmediate); } return render(); },
    unmount() { mounted = false; for (const cleanup of cleanups) cleanup?.(); },
  };
}

test.beforeEach(async () => {
  await persistence.flushSettingsWrites().catch(() => undefined);
  if (session.getAdminSessionToken()) session.forgetAdminSession(session.getAdminSessionToken());
  global.window = { __TAURI_INTERNALS__: {} };
  process.env.NODE_ENV = "test";
  nativeCalls = [];
  nativeHandler = async (command) => command === "unlock_master_prices" ? tokenA : undefined;
});
test.after(() => {
  if (originalEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnvironment;
  delete global.window; delete global.__adminTestInvoke;
  fs.rmSync(temp, { recursive: true, force: true });
});

test("verifier uses a random salt and 600000 PBKDF2-SHA256 iterations", () => {
  const first = createVerifier("a-strong-test-passphrase");
  const second = createVerifier("a-strong-test-passphrase");
  assert.equal(ITERATIONS, 600000); assert.notEqual(first, second);
  assert.ok(verifyWithNode("a-strong-test-passphrase", first));
  assert.ok(!verifyWithNode("incorrect", first));
  assert.ok(!first.includes("a-strong-test-passphrase"));
});
test("demo fixture accepts 1111 and rejects a different password", () => {
  const { verifier } = require(path.join(temp, "src-tauri/admin-password.json"));
  assert.ok(verifyWithNode("1111", verifier)); assert.ok(!verifyWithNode("1112", verifier));
});
test("Persian and Arabic digits work without silently trimming spaces", () => {
  const persian = "\u06f1\u06f1\u06f1\u06f1", arabic = "\u0661\u0661\u0661\u0661";
  assert.equal(normalizePassword(persian), "1111"); assert.equal(access.normalizeAdminPassword(arabic), "1111");
  assert.equal(access.normalizeAdminPassword(" 1111 "), " 1111 ");
});
test("password configuration rejects too-short and oversized passwords", () => {
  assert.throws(() => createVerifier("123")); assert.throws(() => createVerifier("x".repeat(129)));
});
test("only well-formed native session tokens are accepted", () => {
  for (const invalid of [null, true, "1111", "a".repeat(63), "A".repeat(64)]) assert.throws(() => session.acceptAdminSession(invalid));
  assert.equal(session.getAdminSessionToken(), null);
});
test("a stale logout cannot clear a newer session", () => {
  session.acceptAdminSession(tokenA); session.acceptAdminSession(tokenB); session.forgetAdminSession(tokenA);
  assert.equal(session.getAdminSessionToken(), tokenB);
});
test("native login uses IPC, never a frontend password comparison", async () => {
  assert.equal(await access.unlockMasterPrices("\u06f1\u06f1\u06f1\u06f1"), tokenA);
  assert.deepEqual(nativeCalls[0], { command: "unlock_master_prices", args: { password: "1111" } });
});
test("native failure does not fall back even in development mode", async () => {
  process.env.NODE_ENV = "development";
  nativeHandler = async () => { throw "ADMIN_BAD_PASSWORD"; };
  await assert.rejects(access.unlockMasterPrices("1111"), (error) => error === "ADMIN_BAD_PASSWORD");
  assert.equal(session.getAdminSessionToken(), null);
});
test("production browser administration is denied", async () => {
  global.window = {}; process.env.NODE_ENV = "production";
  await assert.rejects(access.unlockMasterPrices("1111"), /ADMIN_NATIVE_REQUIRED/);
  assert.equal(nativeCalls.length, 0);
});
test("development browser can verify the demo PIN using real WebCrypto", async () => {
  global.window = {}; process.env.NODE_ENV = "development";
  const token = await access.unlockMasterPrices("1111"); assert.match(token, /^[0-9a-f]{64}$/);
  await access.lockMasterPrices(token); assert.equal(session.getAdminSessionToken(), null);
});
test("development attempt limiter serializes simultaneous guesses", async () => {
  global.window = {}; process.env.NODE_ENV = "development";
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => access.unlockMasterPrices("bad")));
  assert.ok(results.every((result) => result.status === "rejected"));
  await assert.rejects(access.unlockMasterPrices("1111"), /ADMIN_LOCKED/);
});
test("logout revokes the native token and then clears local memory", async () => {
  session.acceptAdminSession(tokenA); await access.lockMasterPrices(tokenA);
  assert.deepEqual(nativeCalls.at(-1), { command: "lock_master_prices", args: { sessionToken: tokenA } });
  assert.equal(session.getAdminSessionToken(), null);
});
test("a failed native logout leaves permission available for a close retry", async () => {
  session.acceptAdminSession(tokenA); nativeHandler = async () => { throw new Error("IPC failed"); };
  await assert.rejects(access.lockMasterPrices(tokenA)); assert.equal(session.getAdminSessionToken(), tokenA);
});
test("queued writes capture the session at edit time", async () => {
  session.acceptAdminSession(tokenA); const state = initial(); const write = persistence.saveSettings(state);
  session.forgetAdminSession(tokenA); await write;
  assert.equal(nativeCalls[0].args.sessionToken, tokenA);
  assert.deepEqual(JSON.parse(nativeCalls[0].args.payload), state);
  assert.ok(!nativeCalls[0].args.payload.includes(tokenA));
});
test("ordinary settings retain their exact payload when no session is open", async () => {
  const state = initial(); await persistence.saveSettings(state);
  assert.deepEqual(nativeCalls[0].args, { payload: JSON.stringify(state), sessionToken: null });
});
test("a denied save rejects flush and blocks saving a quote", async () => {
  nativeHandler = async (command) => { if (command === "save_state") throw new Error("ADMIN_REQUIRED"); };
  await assert.rejects(persistence.saveSettings(initial()), /ADMIN_REQUIRED/);
  await assert.rejects(persistence.flushSettingsWrites(), /ADMIN_REQUIRED/);
  await assert.rejects(persistence.saveQuote(initial(), { enabledRows: [], total: 0 }), /ADMIN_REQUIRED/);
  assert.ok(!nativeCalls.some((call) => call.command === "save_quote"));
});
test("the save queue recovers after an earlier rejected save", async () => {
  nativeHandler = async () => { throw new Error("failure"); };
  await assert.rejects(persistence.saveSettings(initial()));
  nativeHandler = async () => undefined;
  await persistence.saveSettings(initial()); await persistence.flushSettingsWrites();
});
test("hook keeps the master table closed until a successful login", async () => {
  const hook = hookHarness(); assert.equal(hook.render().phase, "password");
  nativeHandler = async () => { throw "ADMIN_BAD_PASSWORD"; };
  await hook.render().authenticate("wrong"); assert.equal(hook.render().phase, "password"); assert.ok(hook.render().error);
  nativeHandler = async (command) => command === "unlock_master_prices" ? tokenA : undefined;
  await hook.render().authenticate("1111"); assert.equal(hook.render().phase, "prices"); hook.unmount();
});
test("double submission makes only one authentication request", async () => {
  const wait = deferred(); nativeHandler = async () => wait.promise;
  const hook = hookHarness(); const first = hook.render().authenticate("1111"); const second = hook.render().authenticate("1111");
  wait.resolve(tokenA); await Promise.all([first, second]);
  assert.equal(nativeCalls.filter((call) => call.command === "unlock_master_prices").length, 1);
  nativeHandler = async () => undefined; hook.unmount(); await hook.settle();
});
test("close saves latest edits before revoking the session", async () => {
  let closed = 0; const hook = hookHarness({ onClose() { closed++; } });
  await hook.render().authenticate("1111");
  const changed = { ...initial(), prices: { "M001|brand": 4500 } }; hook.setProps({ settings: changed });
  hook.render().requestClose(); await hook.settle();
  const save = nativeCalls.findIndex((call) => call.command === "save_state");
  const lock = nativeCalls.findIndex((call) => call.command === "lock_master_prices");
  assert.ok(save >= 0 && lock > save); assert.deepEqual(JSON.parse(nativeCalls[save].args.payload), changed);
  assert.equal(closed, 1); assert.equal(session.getAdminSessionToken(), null); hook.unmount();
});
test("reset runs its original callback once and saves the updated parent state", async () => {
  let resets = 0, closes = 0;
  const hook = hookHarness({ action: "reset", onResetDemo() { resets++; hook.setProps({ settings: { ...initial(), prices: {}, previousPrices: {} } }); }, onClose() { closes++; } });
  await hook.render().authenticate("1111"); await hook.settle();
  assert.equal(resets, 1); assert.equal(closes, 1);
  const saved = nativeCalls.find((call) => call.command === "save_state");
  assert.deepEqual(JSON.parse(saved.args.payload).prices, {}); hook.unmount();
});
test("save failure keeps the access dialog in a recoverable error state", async () => {
  let closes = 0; const hook = hookHarness({ onClose() { closes++; } }); await hook.render().authenticate("1111");
  nativeHandler = async (command) => { if (command === "save_state") throw new Error("disk failure"); };
  hook.render().requestClose(); await hook.settle();
  assert.equal(hook.render().phase, "close-error"); assert.equal(closes, 0); assert.equal(session.getAdminSessionToken(), tokenA);
  nativeHandler = async () => undefined; hook.render().retryClose(); await hook.settle();
  assert.equal(closes, 1); hook.unmount();
});
test("a cancelled pending login is revoked and cannot reopen the table", async () => {
  const wait = deferred(); nativeHandler = async (command) => command === "unlock_master_prices" ? wait.promise : undefined;
  const hook = hookHarness(); const login = hook.render().authenticate("1111"); hook.unmount(); wait.resolve(tokenA); await login;
  assert.ok(nativeCalls.some((call) => call.command === "lock_master_prices")); assert.equal(session.getAdminSessionToken(), null);
});
test("messages do not echo arbitrary native errors or credentials", () => {
  assert.ok(!messages.adminErrorMessage(new Error("private diagnostic string")).includes("private diagnostic string"));
});
test("gate, reset button, and controlled Escape are wired in source", () => {
  const management = fs.readFileSync(path.join(root, "components/price-manager/management-tools.tsx"), "utf8");
  assert.match(management, /setAdminAction\("prices"\)/); assert.match(management, /setAdminAction\("reset"\)/);
  assert.doesNotMatch(management, /<MasterPricesDialog/);
  const gate = fs.readFileSync(path.join(root, "components/admin/master-price-access.tsx"), "utf8");
  assert.match(gate, /access\.phase === "prices"/);
  const dialog = fs.readFileSync(path.join(root, "components/ui/dialog.tsx"), "utf8");
  assert.match(dialog, /event\.preventDefault\(\); onClose\(\)/);
});
test("changed JSX and TypeScript parse without syntax errors", () => {
  for (const relative of ["components/admin/admin-password-dialog.tsx", "components/admin/master-price-access.tsx", "components/price-manager/management-tools.tsx", "components/ui/dialog.tsx"]) {
    const output = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), { fileName: relative, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
    assert.equal(output.diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0, relative);
  }
});
test("cancelled login forgets local permission even when native revocation fails", async () => {
  const wait = deferred();
  nativeHandler = async (command) => {
    if (command === "unlock_master_prices") return wait.promise;
    if (command === "lock_master_prices") throw new Error("IPC disconnected");
  };
  const hook = hookHarness(); const login = hook.render().authenticate("1111");
  hook.unmount(); wait.resolve(tokenA); await login;
  assert.equal(session.getAdminSessionToken(), null);
});
