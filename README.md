# Bollourian Elevator — Offline Price Manager

A working Next.js 16 + Tauri 2 + bundled SQLite desktop prototype. No remote APIs or CDN.

## Windows prerequisites (developer only)
Node.js 22+, Rust/Cargo, Visual Studio Build Tools (Desktop development with C++), Windows SDK, WebView2 runtime.

```powershell
npm install
npm run desktop:dev
npm run desktop:build
```

Installer output: `src-tauri/target/release/bundle/nsis/` (EXE) and `/msi/` (MSI). Client does not install Node, Rust, Cargo or PostgreSQL. The client may need WebView2 (usually already present).

`npm run dev` opens a **browser preview** using localStorage. Desktop uses **SQLite** automatically. They have separate data storage; backup/restore JSON can transfer settings.

## Data provenance and important limitations

- `data/catalog.json`: 49 master Excel rows (48 priced; R038 is 'بدون قیمت'), plus 18 PDF-derived catalog placeholders. **PDF-derived prices are intentionally null** if absent from the Excel master.
- Excel source sheets: `قیمت_مادر` (price lookup), `تعداد_توقف` (quantities only for 6, 7, 8), `لیست_خروجی` (quantity × price and category sums).
- Some mechanically matched **5-stop quantities** transcribed from PDF `15530` are included. Other 5-stop quantities must be entered manually.
- Stops 1–4 and 9–13 are selectable but **have no validated quantities** in the supplied Excel; do not issue customer quotations without verifying them.
- Gearbox vs gearless changes the selector but no validated rules for brand/part compatibility are in the sources. Motor 7.5 kW is displayed for 4–6 people and 11 kW for 8 people. Brand lists only contain names explicitly identifiable in the source; no fake options.
- Eight PDF filenames represent the eight supplied examples, not a complete specification for all permutations.
- 'ریل' is sourced from the zero-to-hundred PDFs and not a separate PDF. Automatic/semi door subcategories are inferred from invoice descriptions and require client verification.
- The PDF layout is a print-specific blue-and-white template inspired by the provided mockup. **Logo and hero background were deliberately omitted**. Exact pixel-for-pixel PDF design still needs a high-resolution reference and logo.
- State is persisted to SQLite (`bollourian.db` in the Tauri application data directory); use the backup JSON action before reinstalling or changing identifiers.
- PDF output uses the system WebView print dialog, 'Save as PDF'. Printing is blocked if any enabled line lacks a price or quantity. Prices are in toman, as in the Excel, not rial as in the sample PDF invoices.

## Future validation checklist
1. Obtain actual stop quantities for 1–4, 9–13, and missing 5-stop products.
2. Obtain official product/brand choices and motor/gearbox/gearless compatibility matrix.
3. Verify category inclusion per all 8 packages and automatic vs semi door components.
4. Verify price units (toman vs rial), VAT, rounding, and discounts.
5. Compare several outputs against client-approved examples before production use.
