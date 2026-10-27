# Validation of the pricing patch

## Baseline

The changed existing files were reconstructed from the delivered desktop patch
and checked against the GitHub blob hashes at
`40e5afe3968384cd17b4972dc46f59b357fa63c0` (optimizing UI).
No source fonts or image binaries are included in this patch.

## Completed checks

- `npm test`: **6084 passing assertions**.
- All **96** package / stop / capacity / drive-type configurations exercised.
- All 48 real workbook items checked against the original cells at 6, 7, 8 stops.
- Independent literal golden totals checked at demo and original workbook prices.
- All **364 invoice row-family mappings** and all eight source row counts checked.
- All **248 original formula strings** retained in the reference fixture.
- Zero, blank, negative, non-finite, exclusion and optional-adjustment cases checked.
- Previous-price comparisons and division-by-zero handling checked.
- Six motor brands verified at both power ratings.
- Scenario isolation, old JSON state migration, backup versions 1/2 and explicit demo reset checked.
- Persistence functions exercised with mocked browser storage / Tauri IPC;
  ordered saves and brand/provenance in quote snapshots checked.
- Strict TypeScript semantic checking passed for the pure domain modules listed below.
- All 19 frontend TS/TSX modules parsed and transpiled without syntax diagnostics.
- Whitespace / conflict-marker checks passed.
- `git apply --check` and actual application tested against a clean baseline copy.

## Reproducible commands

```powershell
npm test
npm run typecheck
npm run build
npm run desktop:dev
```

The standalone domain check used during preparation:

```text
tsc --noEmit --strict --target ES2020 --lib ES2020,DOM --module esnext --moduleResolution bundler --resolveJsonModule --esModuleInterop lib/price-manager/types.ts lib/price-manager/constants.ts lib/price-manager/calculations.ts lib/price-manager/catalog.ts lib/price-manager/master-price.ts lib/price-manager/package-rules.ts lib/price-manager/quantity-rules.ts lib/price-manager/settings.ts
```

## Explicit limits

Dependency installation could not be completed in this execution environment.
Full-project Next.js/React semantic type checking, a production Next.js build,
real browser interaction/visual regression, and native Windows/Tauri compilation
were **not** verified here. The TSX transpilation check is only a syntax check,
not a substitute for full `npm run typecheck` or an actual UI test.
Mocked IPC is not a native SQLite integration test.

The tests confirm the documented lookup/membership behavior. They do not certify
mechanical suitability, brand interchangeability, or quantities absent from the
source files. Unknown values deliberately remain unknown.
