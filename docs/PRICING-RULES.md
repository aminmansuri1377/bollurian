# Pricing rules: source-based demo, revision 2

## Applying this patch

The patch targets commit `40e5afe3968384cd17b4972dc46f59b357fa63c0`
(`optimizing UI`) of `aminmansuri1377/bollurian`, after the desktop Tailwind patch.
It does not modify the Rust commands, SQLite schema/identifier, fonts, images,
Tailwind configuration or dependency versions. No new package is required.

```powershell
git apply --check .\bollurian-pricing-demo.patch
git apply .\bollurian-pricing-demo.patch
npm test
npm run typecheck
npm run desktop:dev
```

Commit or stash local changes first. Stop if `git apply --check` reports a
conflict; do not force the patch onto another revision.

All initial master prices are now **1000 toman**, including both motor powers
and all PDF-only items. Existing custom prices are intentionally preserved.
To start a completely clean demonstration, use the **1000-toman demo reset**
button inside management tools. It asks for confirmation, downloads the previous
settings as JSON, and then clears custom prices, previous prices, manual counts,
exclusions and the optional percentage adjustment. It does not delete SQLite or
historical quotes. Keep the downloaded backup in a safe place.

## The pricing pipeline

1. `package-rules.ts` selects equipment IDs belonging to the chosen PDF package.
2. Capacity selects the 7.5 kW or 11 kW motor and the matching controller entry.
3. `quantity-rules.ts` reads the **literal** quantity for stop 6, 7 or 8.
4. `master-price.ts` reads the current master price (custom override or 1000).
5. `calculateLineTotal(quantity, price)` computes the line amount:
   if either input is absent, return `null`; otherwise return `quantity * price`.
6. The quote sums enabled rows, with category subtotals equivalent to `SUMIF`.

There is **no package-price multiplier**, **no passenger-count multiplier**, and
**no linear extension of the stop table**. Package changes select different
rows. A motor brand change selects a label; all six brands have the same demo
price. No claim of technical brand/drivetrain compatibility is made.

### The workbook's MATCH defect is corrected, not silently copied

`list output!B2` contains a numeric stop count. The quantity worksheet headers
are text such as `6 [Persian word for stops]`. The supplied formula compares the
number directly against those strings using exact `MATCH`. That mismatch is
hidden by `IFERROR`, and cached output quantities are blank with zero totals.

The app uses keys `"6"`, `"7"`, `"8"` to access the corresponding columns C, D,
E. This implements the workbook guide's stated intent, not its broken cached
results. All **248 original formulas**, including the array-formula text, are
preserved in `tests/fixtures/workbook-reference.json` for inspection.

### Examples to present to the client

All values below use a 1000-toman unit price and zero optional adjustment.

| Product ID | Quantity: 6 stops | 7 stops | 8 stops | Result at 6 stops |
|---|---:|---:|---:|---:|
| M001 (10 mm rope) | 96 | 108 | 120 | 96,000 |
| M002 (6 mm rope) | 48 | 54 | 60 | 48,000 |
| R023 (landing buttons) | 6 | 7 | 8 | 6,000 |
| R029 (travelling cable) | 31 | 34 | 38 | 31,000 |
| R031 (wire) | 5 | 6 | 8 | 5,000 |

In particular, `31, 34, 38` and `5, 6, 8` must not be replaced by an invented
constant increment. The full mechanical package totals are 208,000 / 226,000 /
244,000 toman for 6 / 7 / 8 stops respectively.

Opening a product's details displays its quantity source (worksheet cell,
manual override or missing), its current count and the multiplication used.

### Previous price and percentage changes

The workbook has a **separate previous-price column**. The master-price dialog
now has the corresponding editable field; it is not automatically populated
with the demo baseline.

```ts
ratio = currentPrice / previousPrice - 1;
percentageShown = ratio * 100;
```

When either price is absent, comparison is unavailable. A zero previous price
has no defined percentage; the app avoids infinity/division-by-zero. A current
price of zero is a valid 100% decrease from a positive previous price.
The increase/decrease/unchanged labels follow the workbook's comparisons.

The pre-existing **optional quote adjustment** is separate from the workbook:

```ts
baseTotal = quantity * unitPrice;
finalTotal = baseTotal * (1 + optionalAdjustmentPercent / 100);
```

It defaults to zero, is explicitly labelled as an app extension, and is printed
in the report. No implicit `Math.round` is added to the workbook's multiplication.
Numeric display formatting remains separate from stored/calculated values.

## PDF package membership

The audit in `data/reference/invoices.json` covers all 364 rows in all eight PDFs.
It maps **equipment families**, not a verbatim brand/model SKU inventory.

| Package | Equipment rows | Rows without a 6/7/8 quantity in the sources |
|---|---:|---:|
| Rail | 9 | 9 |
| Mechanical | 11 | 0 |
| Automatic startup | 37 | 6 |
| Semi-automatic startup | 41 | 11 |
| Mechanical + automatic startup | 48 | 6 |
| Mechanical + semi-automatic startup | 52 | 11 |
| Full automatic | 57 | 15 |
| Full semi-automatic | 61 | 20 |

These counts include one selected motor power and one controller where applicable.
The standalone mechanical invoice has no motor. Motor and controller belong to
startup, not to every mechanical package.

The automatic cabin door uses workbook ID `R020` exactly once. The previous
`P-CABIN-DOOR` duplicate, unsupported standalone door-motor row and vague extra
rail-fastener row are removed. Semi packages now contain the semi cabin door,
mechanical cam, hinged landing doors, dictator, lock and door spring.

Startup and rail bolts stay separate: the PDFs really contain both sets.
Six workbook-only items (`R014`, `R018`, `R021`, `R026`, `R027`, `R033`) stay in
the master-price catalog but are not silently assigned to a PDF package.
The PDF's earth-wire item is not silently equated to `R033`; that model mapping
and its quantity relationship would need confirmation.

## What the sources do NOT define

The workbook has only a **stop dimension**, not passenger capacity, gearbox vs
gearless, rail rules, or complete automatic/semi-specific quantity tables.
All PDF quantities are example observations; the filenames identify five-stop
lists. They do not establish 6/7/8-stop quantities for PDF-only equipment.

For example, invoice 18948's filename says five stops/eight persons, while its
landing-door and landing-button quantities are eight. The app does not resolve
that discrepancy by guessing a new stop count or a capacity multiplier.

The motor brand list and 4-6 persons -> 7.5 kW / 8 persons -> 11 kW rule come
from the client's explicit message. Other quantities continue to use the
workbook's capacity-neutral reference table. The UI and PDF flag this as a demo,
not an engineering-validated 8-person or gearless bill of materials.

PDF-only quantities remain blank until manually supplied for the exact selected
configuration. Zero is a valid manual input; blank is not zero. Export is blocked
while enabled rows are incomplete. No motor quantity of one, per-floor door
rule, rail-length formula, or brand-price coefficient has been invented.

Do not mix units/models. For example, workbook `M011` uses **14 casts**, while
PDFs show a quantity of **780**, without a unit column, for a differently
described counterweight. No weight/cast conversion is inferred. The PDFs do not include a
unit column; ambiguous PDF-only units are shown neutrally instead of fabricated.
PDF monetary columns are rial; workbook/app monetary values are toman. The demo
does not import PDF prices, so no implicit factor-of-ten conversion occurs.

## Manual edits and storage

Manual quantities use the readable key:

```text
motorType|packageId|capacity|stops|productId
gearbox|full-auto|4-6|6|M001
```

Switching filters cannot carry a manual quantity into a different scenario.
Returning to the same scenario restores its manual edit. Clearing the field
removes that override and returns to the workbook value (or blank when absent).

Legacy flat quantity maps are migrated using their saved filter context. Legacy
five-stop overrides are retained under five-stop keys but never applied to the
new six-stop default. Custom master prices are not silently replaced on load.
Old and new JSON backups are accepted; new exports use version 2. The native
`load_state`, `save_state` and `save_quote` command interfaces are unchanged.
Quote snapshots now explicitly store the selected brand and quantity provenance.

## File map for frontend developers

| File | Responsibility |
|---|---|
| `data/catalog.json` | Static products, base prices, literal 6/7/8 counts, brands |
| `data/reference/package-membership.json` | Reviewed equipment-family groups |
| `data/reference/invoices.json` | Row-by-row PDF evidence; never executable quantity rules |
| `lib/price-manager/package-rules.ts` | Package and power selection |
| `lib/price-manager/quantity-rules.ts` | Lookup and scenario-scoped manual counts |
| `lib/price-manager/master-price.ts` | Current/previous price and comparison |
| `lib/price-manager/calculations.ts` | Pure multiplication, sums and search |
| `lib/price-manager/settings.ts` | Parsing, migration and immutable state changes |
| `lib/price-manager/persistence.ts` | Browser/SQLite persistence and backups |
| `hooks/use-price-manager.ts` | UI orchestration, not business formulas |
| `scripts/test-pricing.cjs` | Source-based regression tests |

`buildWorkbookComparison` is a test/reference utility for all 48 real workbook
rows, independently of PDF package membership. Its total is therefore not the
same as a PDF package that intentionally excludes the six workbook-only items.
