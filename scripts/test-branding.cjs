const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { ICON_FILES, readPngDimensions, createSquareIconSvg, generateAppIcons } = require("./generate-app-icons.cjs");

// Header-only fixtures: these unit tests do not pretend to execute Tauri's image codec.
function pngHeader(width, height) {
  const data = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(data);
  data.writeUInt32BE(13, 8);
  data.write("IHDR", 12, "ascii");
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  data[24] = 8;
  data[25] = 6;
  return data;
}
function temporaryProject(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bollurian branding test "));
  try {
    fs.mkdirSync(path.join(root, "public"));
    fs.mkdirSync(path.join(root, "src-tauri", "icons"), { recursive: true });
    fs.writeFileSync(path.join(root, "public", "icon.png"), pngHeader(648, 696));
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
function mockGeneration(root, input, output) {
  assert.ok(fs.existsSync(input));
  assert.match(fs.readFileSync(input, "utf8"), /viewBox="0 0 696 696"/);
  fs.mkdirSync(output, { recursive: true });
  for (const name of ICON_FILES) fs.writeFileSync(path.join(output, name), `mock-generated:${name}`);
}

test("current source header is 648 by 696, not square", () => {
  const actualHeader = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAogAAAK4CAYAAAD3MwwXAAAACXBIWXMAACxL", "base64");
  assert.deepEqual(readPngDimensions(actualHeader), { width: 648, height: 696 });
});
test("reject missing, corrupt, and renamed non-PNG inputs", () => {
  for (const buffer of [Buffer.alloc(0), Buffer.from("<svg/>"), Buffer.alloc(64)]) assert.throws(() => readPngDimensions(buffer));
  const badChunk = pngHeader(10, 10); badChunk.write("IDAT", 12);
  assert.throws(() => readPngDimensions(badChunk));
});
test("reject zero or unreasonable image dimensions", () => {
  for (const [w, h] of [[0, 10], [10, 0], [16385, 10], [10, 16385]]) assert.throws(() => readPngDimensions(pngHeader(w, h)));
});
test("portrait source gets equal transparent side padding without stretching", () => {
  const png = pngHeader(648, 696);
  const svg = createSquareIconSvg(png);
  assert.match(svg, /width="696" height="696" viewBox="0 0 696 696"/);
  assert.match(svg, /<image x="24" y="0" width="648" height="696"/);
  assert.ok(svg.includes(png.toString("base64")));
  assert.ok(!svg.includes("<rect"));
});
test("landscape source gets equal transparent vertical padding", () => {
  assert.match(createSquareIconSvg(pngHeader(1024, 512)), /<image x="0" y="256" width="1024" height="512"/);
});
test("square source keeps its original geometry", () => {
  assert.match(createSquareIconSvg(pngHeader(512, 512)), /<image x="0" y="0" width="512" height="512"/);
});
test("copies all expected desktop formats and removes temporary generation files", () => temporaryProject((root) => {
  let temporaryInput;
  const original = fs.readFileSync(path.join(root, "public", "icon.png"));
  generateAppIcons(root, (...args) => { temporaryInput = args[1]; mockGeneration(...args); });
  for (const name of ICON_FILES) assert.equal(fs.readFileSync(path.join(root, "src-tauri", "icons", name), "utf8"), `mock-generated:${name}`);
  assert.equal(fs.existsSync(path.dirname(temporaryInput)), false);
  assert.deepEqual(fs.readFileSync(path.join(root, "public", "icon.png")), original);
}));
test("repeated generation does not rewrite unchanged files", () => temporaryProject((root) => {
  generateAppIcons(root, mockGeneration);
  const output = path.join(root, "src-tauri", "icons", "icon.ico");
  const oldTime = new Date("2020-01-01T00:00:00.000Z");
  fs.utimesSync(output, oldTime, oldTime);
  generateAppIcons(root, mockGeneration);
  assert.equal(fs.statSync(output).mtimeMs, oldTime.getTime());
}));
test("failed CLI preserves previous icons and cleans temporary files", () => temporaryProject((root) => {
  let input;
  const oldIcon = path.join(root, "src-tauri", "icons", "icon.ico");
  fs.writeFileSync(oldIcon, "previous-icon");
  assert.throws(() => generateAppIcons(root, (_, file) => { input = file; throw new Error("mock CLI failure"); }), /mock CLI failure/);
  assert.equal(fs.readFileSync(oldIcon, "utf8"), "previous-icon");
  assert.equal(fs.existsSync(path.dirname(input)), false);
}));
test("incomplete CLI output is rejected before replacing any icon", () => temporaryProject((root) => {
  const oldIcon = path.join(root, "src-tauri", "icons", "32x32.png"); fs.writeFileSync(oldIcon, "previous-icon");
  assert.throws(() => generateAppIcons(root, (...args) => { mockGeneration(...args); fs.unlinkSync(path.join(args[2], "icon.ico")); }), /did not generate icon.ico/);
  assert.equal(fs.readFileSync(oldIcon, "utf8"), "previous-icon");
}));
test("empty CLI output is rejected", () => temporaryProject((root) => {
  assert.throws(() => generateAppIcons(root, (...args) => { mockGeneration(...args); fs.writeFileSync(path.join(args[2], "icon.ico"), ""); }), /empty icon.ico/);
}));
test("missing source stops before calling the CLI", () => temporaryProject((root) => {
  fs.unlinkSync(path.join(root, "public", "icon.png"));
  let called = false;
  assert.throws(() => generateAppIcons(root, () => { called = true; }), /Missing public\/icon.png/);
  assert.equal(called, false);
}));
test("Tauri development and release builds both regenerate icons", () => {
  const root = path.resolve(__dirname, "..");
  const config = JSON.parse(fs.readFileSync(path.join(root, "src-tauri", "tauri.conf.json")));
  assert.equal(config.build.beforeDevCommand, "npm run icons:generate && npm run dev");
  assert.equal(config.build.beforeBuildCommand, "npm run icons:generate && npm run build");
  assert.equal(config.bundle.windows.nsis.installerIcon, "icons/icon.ico");
  assert.equal(config.bundle.windows.nsis.uninstallerIcon, "icons/icon.ico");
  for (const name of ICON_FILES) assert.ok(config.bundle.icon.includes(`icons/${name}`));
  assert.equal(config.identifier, "ir.bollourian.elevator", "Keep the existing app/data identity");
});
test("screen and print share the same three-round-corner badge", () => {
  const root = path.resolve(__dirname, "../components/price-manager");
  for (const file of ["product-brand-menu.tsx", "quote-print-document.tsx"]) {
    assert.match(fs.readFileSync(path.join(root, file), "utf8"), /<RowNumberBadge /);
  }
  const badge = fs.readFileSync(path.join(root, "row-number-badge.tsx"), "utf8");
  assert.ok(badge.includes("rounded-[50%_50%_50%_0]"));
  assert.ok(badge.includes('dir="ltr"'));
  assert.ok(badge.includes("{String(value)}"));
});
