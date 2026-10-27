# Compact PDF rows

Base: `aminmansuri1377/bollurian`, commit `cfa8c6d2851b6460cef210641b9e9a6e309f12e6`.

## Cause

The previous quantity cell printed a quantity and a block-level unit with a
20px line height and 16px vertical padding. That cell made every ordinary
row 58px tall. The description cell was also top-aligned.

## Changes

- Extract the print-only row into `QuotePrintRow`.
- Keep quantity and unit together on one line; no information is removed.
- Use 14px line height and small, consistent vertical padding.
- Middle-align cell contents and retain the shared 28px print number badge.
- Allocate 14% of the table to quantity/unit and 22% to each money column.
- Ordinary rows use a 26px minimum content height, not a clipping fixed height.
  Long product descriptions can wrap and grow naturally.
- Preserve the repeating table header and avoid breaking an ordinary row
  between pages. Screen UI, prices, state, SQLite, and icon generation are unchanged.
- All component styling remains Tailwind. No new dependency or stylesheet.

## Validation

- Matched both modified existing files to their GitHub blob hashes before editing.
- Isolated TSX print output, compiled with Tailwind 4.1.10 and printed in Chromium:
  11 mechanic rows at 8 stops went from 58px to 28px each; two A4 pages became one.
  The same corrected fixture also fits one Letter page.
- A 70-row fixture produced three pages; all 70 unique markers occur exactly once
  in extracted PDF text, with the column header repeated. Rendered pages inspected.
- Long descriptions, a seven-digit quantity, a large money value, zero, and missing
  values checked. Long descriptions expand rather than being truncated.
- Existing pricing suite: 6,084 assertions passed.
- Updated branding/layout suite: 15 tests passed.
- `git diff --check` and patch application against a clean baseline passed.

Scope: this is isolated component/Chromium validation, NOT a full Next.js or
native Windows build. The renderer used system fallback fonts because the
repository's Peyda font files were unavailable in the test environment. The test
logo was cropped from the supplied sample PDF. Neither fonts nor images are in
this patch; the real application continues using its existing local assets.

## Apply

```powershell
git apply --check .\bollurian-compact-pdf-rows.patch
git apply .\bollurian-compact-pdf-rows.patch
npm test
npm run test:branding
npm run desktop:dev
```

There is no need to reset data, regenerate a database, or install new packages.
Rebuild the installer to update an already-installed application.
