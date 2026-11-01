# Client changes, 1405/08 (first revision after the new 5-stop lists)

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

## Still open

* Quantities of PDF-only items for 6/7/8 stops (motor, controller, rail, doors, ...) are unknown.
  Because quantities are no longer editable on the main list, those rows show "—" and PDF export
  stays blocked until the quantities are added to `data/catalog.json`.
* Real prices (the Excel master prices) are not loaded; every base price is still 1000 toman.
* Brand lists for products other than the motors.
