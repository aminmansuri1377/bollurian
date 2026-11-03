# Client changes, 1405/08 (revisions 1 to 4)

Base commit: `2e2a1fb` (`fix pdf export`). Pricing formulas are unchanged
(`quantity x master price`); no package-price or passenger multiplier was added.

## Screen behaviour

| Change | Where |
|---|---|
| Quantity, unit price and line total are **read-only** in the main list (and the PDF is built from the same values). | `components/price-manager/product-table.tsx` |
| Prices change **only** in "مدیریت قیمت مادر". | `master-prices-dialog.tsx` |
| The settings card sits at the **top of the page**, always visible: customer name, **customer phone (new)**, quote number, master prices, demo reset. | `management-tools.tsx`, `price-manager.tsx` |
| Removed: optional percentage adjustment, product search, "دریافت/بازیابی پشتیبان". | same + `use-price-manager.ts` |
| The customer phone is saved with the settings and printed in the PDF header. | `settings.ts`, `quote-print-document.tsx` |

The percentage adjustment was removed completely (`rate` no longer exists in the
state; old saved data containing it is ignored), so no hidden adjustment can
remain in a total. `downloadBackup/readBackup` stay in `persistence.ts` because
the demo reset still downloads a safety backup before it clears prices.

## Brands

* `lib/price-manager/brand-rules.ts` holds the client's list of single-model
  products (`SINGLE_BRAND_PRODUCT_IDS`). Their brand can never be chosen, even if
  brands are added to the catalog later.
* A brand menu appears only for products with **two or more** brands that are not on
  that list. Today that is only the motors (six brands each).
* Every selectable brand has **its own master price**. Settings key:
  `productId::brand` (`P-MOTOR-7.5::ABB`). Lookup order: brand price, then the old
  per-product price, then the catalog base price (1000 toman).
* To give another product several brands, add the names to its `brands` array in
  `data/catalog.json`; the master-price dialog then shows one row per brand.

## Packages (from invoices 17784 and 19381)

Row order in every package: mechanic, startup, doors / motor / controller, rail,
**all-steel cabin last** (`P-STEEL-CABIN`, quantity 1 for 6/7/8 stops, base price 1000).

* Automatic wiring order: 75 / 1x4 / 6-pair. Semi-automatic: 6-pair / 75 / 1x4.
* Semi-automatic: motor and controller sit between the doors and the dictator/lock/spring.
* The mechanical cam (`P-SEMI-CAM`) is not in the newest semi list: retired from all packages
  and removed from the catalog (older invoices keep it as evidence).
* `data/reference/invoices.json`: 17784 replaced (58 rows), 15533 replaced by 19381 (60 rows).

Row counts: rail 10, mechanic 12, automatic 38, semi 41, mech+auto 49, mech+semi 52,
full automatic 58, full semi 61.

## Revision 2: 5 stops, capacity rules, brand prices, printed names

* **5 stops** is a new filter value and the default. Its quantities are the printed ones of invoices
  17784 (automatic) and 19381 (semi-automatic), stored in `data/five-stop-quantities.json` and verified
  row by row against `data/reference/invoices.json`. Nothing is blank at 5 stops, for all 8 packages.
  Rail-only and mechanic-only packages use the automatic list. 6-8 stops still use the Excel table.
* **Capacity.** Motor: 6.1 kW (4-6 persons) / 7.3 kW (8 persons), brands بهران، الکو، ABB.
  Controller: 7.5 kW / 11 kW, brands داتیس، پایا، آریان. Mechanic at 5 stops: 4-6 persons 84 / 8 / 24 / 780 and
  the 40x4 pulley; 8 persons 105 / 12 / 32 / 1000 and the 40x5 pulley (`P-PULLEY-40X5` replaces `M008`).
  Other 8-person quantities follow the 4-6 list because the client defined no other difference.
* **Brand prices.** `brandPrices` in `data/catalog.json` gives every brand its own price (demo values
  1000 / 2000 / 3000 in brand order). They are changed only in "مدیریت قیمت مادر".
  Lookup: saved brand price, saved product price, catalog brand price, base price.
* **Names** of all products in the two lists are the printed names (`printedName` in the evidence file; a test compares them).
* **Single-model rows** (the client's list) are static: no menu, nothing happens on click.
* Old hand-typed counts in saved data are dropped on load (counts are read-only), so a hidden number
  can never change a 5-stop quantity.
* One-per-elevator items (motor, controller, earth wire, semi cabin door, 40x5 pulley, steel cabin)
  also have quantity 1 at 6-8 stops, like their Excel analogues.

## Revision 3: rail types (T5 / T9 / T16)

* The two "ریل چین سرد ... درجه یک" rows are selectable like brands. The menu "نوع ریل" offers T5, T9 and T16;
  the type used by the other rail is hidden, so the two rails can never be the same (choosing it from the other
  menu is also swapped in the state). Default: T5 and T9. The choice is saved with the settings.
* Brackets and clips follow the selected types in the same order (T5 + T16 gives bracket T5, T16 and clip T5, T16).
  Row order: rail 1, rail 2, bracket 1, bracket 2, clip 1, clip 2, then the bolts, then the steel cabin.
* All nine parts (rail, bracket, clip x T5/T9/T16) exist in `data/catalog.json` and appear in
  "مدیریت قیمت مادر", each with its own price (demo 1000 / 2000 / 3000 for T5 / T9 / T16).
* Rail bolts: only when **both T9 and T16** are selected, the bolts 10 and 8 are removed and their
  quantities are added to bolt 12 (5 stops: auto 105 + 50 + 60 = 215, semi 104 + 50 + 56 = 210).
  Otherwise the three bolts stay at the end, before the steel cabin. A note on the screen explains the merge.
  The merge applies to the rail bolts only, not to the startup bolts 10 / 8.
* Quantities per kind at 5 stops (`railKinds` in `data/five-stop-quantities.json`): auto rail 7 / bracket 22 / clip 44,
  semi 7 / 24 / 48. T16 uses the same per-kind counts as T5 and T9 (assumption: the invoices only show two types).
* Code: `lib/price-manager/rail-rules.ts` (selection, choices, merge rule), `package-rules.ts`, `quantity-rules.ts`,
  `product-brand-menu.tsx` (the menu), `product-table.tsx`, tests in `scripts/test-pricing.cjs` (section 4d).

## Revision 4: stops 3 to 9, capacity 8, package names

* Stop counts 3, 4, 5, 6, 7, 8, 9. Quantities of every package come from the client's printed "صفر تا صد" invoices
  (`data/stop-quantities.json`; evidence rows of the 12 new files in `data/reference/stop-invoices.json`, 5 stops: 17784 / 19381).
  Other packages take their rows from the same list of the same stop count (rail, mechanic and mechanic-only use the automatic list).
  A row that a printed list does not contain is not shown (the screws-and-plugs row is not printed in 6-stop automatic list 15587).
* Names: "ریل، مکانیک و راه‌اندازی ..." became "صفر تا صد تمام اتومات / نیمه اتومات".
* The all-steel cabin is the last row only in: mechanic + startup (automatic / semi) and "صفر تا صد" (automatic / semi). Not in rail, mechanic, startup-only.
* Capacity rules for every stop count (`capacityRules` in the data file):
  rope 10 = 4 x the number in the description (24 at 6 stops gives 96); 8 persons 5 x (120). Serbokosl 10: 8 / 10. Krapi 10: 24 / 32. Weight 87+: 780 / 1000.
  Pulley 40x4 (4-6) / 40x5 (8). Motor 6.1 / 7.3 and controller 7.5 / 11 as before. Other rows are the same for both capacities.
* Rails: counts per type and kind for each stop count. 3 stops automatic prints T5 = 8 and T9 = 5. T16 follows T9 (assumption).
* Products tied to the stop count: cabin button 3, 4, 6, 7, 8, 9 stops (5 = R022) and, at 9 stops, gold floor buttons
  (blue light automatic, red light semi). Each has its own master price.
* Not copied from the older printed lists (names differ between files, the newest 5-stop names are kept): travelling cable
  "آسیا پلاس"/"هدسان", cable clamp "درجه 1"/"یاشار", tunnel lamp 12 W / 18 W / "راین", metal sensor, buffer "آلسن", dictator "سپاهان",
  two-speed motor "AC1", rope "چین درجه یک", MDF cabin. The mechanical cam (older semi lists) stays retired.

### Printed values that look like mistakes (followed exactly)
* 6 stops automatic (15587): buffer 5 (others 2). 3 stops automatic (15595): duct 3 = 26 (semi 16).
* 7 stops semi (19383): earth wire 6 (others 1). 8 stops semi (15661): floor buttons 6 (8 stops).
* 3 stops semi (15599): the cabin button is printed "5 توقف"; the 3-stop button is used.
* 15663 (9 stops automatic) is an 8-person list (40x5 pulley, 7.3 kW, 11 kW); 15675 (9 stops semi) prints rope 5 x 35.

## Still open

* Quantities at 6/7/8 stops of landing doors, startup bolts 10/8, semi doors/dictator/lock/spring and all rail items
  are unknown. They show "—" and PDF export stays blocked for those packages until the quantities are added to
  `data/catalog.json`. Stops 3-4 and 9-13 are planned later.
* Real prices (the Excel master prices) are not loaded; every base price is still 1000 toman.
* Brand lists for products other than motors and controllers; brand prices are demo values.
