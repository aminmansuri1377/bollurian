# Row numbers and Windows app icon

Patch base: `39a2dbaffa30ea7c2185ff740af128c288827268` (`prise demo & icon`).

## Row number shape

`components/price-manager/row-number-badge.tsx` is shared by the screen table
and printable quote. All styling remains in Tailwind classes.

- Physical corner order is top-left, top-right, bottom-right, bottom-left:
  `rounded-[50%_50%_50%_0]`. The bottom-left corner must stay square in RTL.
- Blue gradient, centered white Latin digits, as in the supplied detail image.
- Screen: 50 by 50 pixels. Print: 28 by 28 pixels.
- The badge overlaps the row border by one pixel, so it joins the top/right/bottom
  edges without a white seam. Print descriptions can still wrap to multiple lines.
- Product details, brand selection, numeric input, and pricing are unchanged.

## Source icon and generation

The source is the existing `public/icon.png` in the repository. Its PNG header
is 648 by 696 pixels, so it cannot be passed as a square PNG directly.

`scripts/generate-app-icons.cjs` wraps the *unaltered* PNG in a temporary,
self-contained square SVG. With this source the canvas is 696 by 696, with
24 transparent pixels on either side. It does not crop, stretch, redraw,
remove the original background, or overwrite `public/icon.png`.

The script calls the installed Tauri CLI (`@tauri-apps/cli/tauri.js`) using
Node directly. Arguments are passed without a shell, including paths with spaces.
No npx download, global image tool, or new npm dependency is required.

The following generated desktop assets are copied to `src-tauri/icons`:

```text
32x32.png
128x128.png
128x128@2x.png
icon.png
icon.ico
```

Tauri's `beforeDevCommand` and `beforeBuildCommand` both run this step. Existing
`npm run desktop:dev`, `npm run desktop:build`, and `npm run tauri -- build`
therefore use the same icon workflow. `npm run build` remains a frontend-only build.
To regenerate icons explicitly:

```powershell
npm run icons:generate
```

`bundle.icon` supplies the application icon; the NSIS installer/uninstaller
also explicitly use `icons/icon.ico`. An installed shortcut uses the icon
embedded in the newly built executable. This is not just a browser favicon.
Desktop shortcut creation still follows the installer's existing options.

If the source is missing, malformed, or conversion fails, the build stops.
The temporary directory is cleaned up. Expected output files are all checked
before existing icon files are replaced. No database files are touched.
The Tauri product name, version, and identifier remain unchanged.

## Apply and run

Save your existing local changes first. Put the patch beside `package.json`:

```powershell
git apply --check .\bollurian-row-badges-app-icon.patch
git apply .\bollurian-row-badges-app-icon.patch
npm run test:branding
npm test
npm run desktop:dev
```

An existing working checkout does not need a new dependency installation.
For a fresh checkout, run `npm install` first.

To produce the Windows installer:

```powershell
npm run desktop:build
```

Use the newly generated installer under `src-tauri\target\release\bundle\nsis\`.
Close the old application and install the new build. An already-built old EXE
is not modified by applying this source patch.

## Validation performed

- All four modified baseline files were reconstructed from the supplied project
  and earlier patches, then their Git blob hashes were checked against the live
  GitHub files at the commit above. New files are included in the patch.
- 6,084 existing pricing assertions passed unchanged.
- 14 new `node:test` cases passed: PNG metadata validation, square geometry,
  transparent padding, cleanup, failure handling, unchanged source bytes,
  idempotent writes, desktop build hooks, and shared badge integration.
  The CLI itself is **mocked** in these unit tests; they do not validate a native ICO.
- The actual badge TSX was transpiled and its utilities compiled with Tailwind
  4.1.10. Isolated HTML was rendered in Chromium under screen and print media.
  Checked nine badges (including two-digit numbers), the three rounded corners,
  square bottom-left corner, and exact screen row-edge alignment. This harness
  uses a system font, not the project's Peyda asset, and is not a full-app test.
- `git diff --check` and clean-baseline patch application were checked.

Not performed here: full Next.js production build, native Tauri icon conversion
with the complete source PNG, Windows compilation, installer execution, or
Windows desktop/Taskbar verification. Run the build above on the Windows machine.

## Official references

- https://v2.tauri.app/develop/icons/
- https://v2.tauri.app/reference/config/#nsisconfig
