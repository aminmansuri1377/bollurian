/** Build-time only. The installed desktop app never needs Node or this script. */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ICON_FILES = ["32x32.png", "128x128.png", "128x128@2x.png", "icon.png", "icon.ico"];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(png) {
  if (png.length < 33 || !png.subarray(0, 8).equals(PNG_SIGNATURE)
    || png.readUInt32BE(8) !== 13 || png.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("public/icon.png must be a valid PNG image (not a renamed JPEG or SVG).");
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height || width > 16384 || height > 16384) {
    throw new Error("Icon dimensions must be between 1 and 16384 pixels.");
  }
  return { width, height };
}

/** Embed the original PNG in a transparent square. Never crop or stretch the logo. */
function createSquareIconSvg(png) {
  const { width, height } = readPngDimensions(png);
  const side = Math.max(width, height);
  const x = (side - width) / 2;
  const y = (side - height) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">
  <image x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${png.toString("base64")}" />
</svg>\n`;
}

function runTauriIcon(projectRoot, input, output) {
  let cli;
  try {
    // Invoke the installed JS entrypoint, not npx or a Windows .cmd shell wrapper.
    cli = require.resolve("@tauri-apps/cli/tauri.js", { paths: [projectRoot] });
  } catch {
    throw new Error("Tauri CLI is not installed. Run npm install, then retry.");
  }
  const result = spawnSync(process.execPath, [cli, "icon", input, "--output", output], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Tauri icon generation failed (${result.signal || result.status}). Build stopped to avoid packaging an old icon.`);
  }
}

function generateAppIcons(projectRoot = path.resolve(__dirname, ".."), generate = runTauriIcon) {
  const sourcePath = path.join(projectRoot, "public", "icon.png");
  if (!fs.existsSync(sourcePath)) throw new Error("Missing public/icon.png. Add your source icon before building.");
  const source = fs.readFileSync(sourcePath);
  const svg = createSquareIconSvg(source);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "bollurian-icons-"));
  try {
    const input = path.join(temp, "square-icon.svg");
    const generatedDirectory = path.join(temp, "generated");
    fs.writeFileSync(input, svg, "utf8");
    generate(projectRoot, input, generatedDirectory);

    // Read every output before replacing any existing icon. Failed CLI runs are fatal.
    const icons = ICON_FILES.map((name) => {
      const file = path.join(generatedDirectory, name);
      if (!fs.existsSync(file)) throw new Error(`Tauri did not generate ${name}. Existing icons were kept.`);
      const bytes = fs.readFileSync(file);
      if (!bytes.length) throw new Error(`Tauri generated an empty ${name}. Existing icons were kept.`);
      return { name, bytes };
    });
    const destination = path.join(projectRoot, "src-tauri", "icons");
    fs.mkdirSync(destination, { recursive: true });
    for (const { name, bytes } of icons) {
      const file = path.join(destination, name);
      // Avoid unnecessary file changes and development restarts.
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) fs.writeFileSync(file, bytes);
    }
    console.log("App icons ready: public/icon.png -> src-tauri/icons (PNG + Windows ICO).");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    generateAppIcons();
  } catch (error) {
    console.error(`[icons] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = { ICON_FILES, readPngDimensions, createSquareIconSvg, generateAppIcons };
