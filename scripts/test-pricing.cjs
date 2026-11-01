/* Source-based domain tests. Runs with the existing TypeScript dependency only. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "bollurian-pricing-"));
let assertions = 0;
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions += 1; }
function near(actual, expected, label) { assert.ok(Math.abs(actual - expected) < 1e-8, label); assertions += 1; }
function throws(callback, label) { assert.throws(callback, label); assertions += 1; }
function readJSON(file) { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); }
function load(name) { return require(path.join(temp, "lib/price-manager", `${name}.js`)); }

async function run() {
  fs.mkdirSync(path.join(temp, "lib/price-manager"), { recursive: true });
  fs.cpSync(path.join(root, "data"), path.join(temp, "data"), { recursive: true });
  for (const name of fs.readdirSync(path.join(root, "lib/price-manager"))) {
    if (!name.endsWith(".ts")) continue;
    const fileName = path.join(root, "lib/price-manager", name);
    const compiled = ts.transpileModule(fs.readFileSync(fileName, "utf8"), {
      fileName, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    equal(compiled.diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0, `${name}: syntax`);
    fs.writeFileSync(path.join(temp, "lib/price-manager", name.replace(/\.ts$/, ".js")), compiled.outputText);
  }

  const { INITIAL_SETTINGS, PACKAGE_OPTIONS, SUPPORTED_STOPS, DEMO_BASE_PRICE } = load("constants");
  const { PRODUCTS: products } = load("catalog");
  const { calculateRow, calculateLineTotal, buildQuote, buildWorkbookComparison, selectProducts } = load("calculations");
  const { isBrandSelectable, resolveBrand, getPriceKey, SINGLE_BRAND_PRODUCT_IDS } = load("brand-rules");
  const { getPackageProductIds } = load("package-rules");
  const { getQuantityOverrideKey } = load("quantity-rules");
  const { getMasterPrice, comparePrices } = load("master-price");
  const { parseSettings, updateNumericSetting, createDemoSettings } = load("settings");
  const { parseNumericInput } = load("format");
  const persistence = load("persistence");
  const workbook = readJSON("tests/fixtures/workbook-reference.json");
  const invoices = readJSON("data/reference/invoices.json").invoices;
  const membership = readJSON("data/reference/package-membership.json");
  const byId = new Map(products.map((p) => [p.id, p]));
  const sourceById = new Map(workbook.records.map((p) => [p.id, p]));

  // 1. All workbook formulas and all invoice rows are retained as auditable evidence.
  equal(workbook.formulas.length, 248, "248 original formulas, including array formulas");
  equal(workbook.records.length, 49, "48 products plus the R038 placeholder");
  equal(workbook.stopHeaders, ["6 \u062a\u0648\u0642\u0641", "7 \u062a\u0648\u0642\u0641", "8 \u062a\u0648\u0642\u0641"], "The MATCH source headers are text");
  equal(workbook.stopHeaders.includes(workbook.selectedStop), false, "Documented source MATCH mismatch");
  equal(invoices.length, 8, "All eight PDFs reviewed");
  equal(invoices.reduce((sum, invoice) => sum + invoice.rows.length, 0), 364, "All 364 printed invoice rows mapped");
  equal(invoices.find((i) => i.invoiceNumber === "17784").rows.length, 58, "Newest automatic list: 58 rows incl. all-steel cabin");
  equal(invoices.find((i) => i.invoiceNumber === "19381").rows.length, 60, "Newest semi-automatic list: 60 rows");
  equal(SUPPORTED_STOPS, [6, 7, 8], "No unsupported stop option");
  equal(INITIAL_SETTINGS.stops, 6, "Default is a supported stop");
  equal(products.length, 72, "71 products plus placeholder");
  equal(new Set(products.map((p) => p.id)).size, products.length, "No duplicate catalog IDs");
  for (const product of products) equal(product.price, DEMO_BASE_PRICE, `${product.id}: every base price is 1000`);

  // Literal source-cell comparisons: no linear extrapolation or five-stop substitution.
  for (const record of workbook.records) {
    const product = byId.get(record.id);
    equal(product.name, record.name, `${record.id}: workbook terminology`);
    equal(product.unit, record.unit, `${record.id}: workbook unit`);
    equal(product.workbookRow, record.masterRow, `${record.id}: row provenance`);
    for (const stops of SUPPORTED_STOPS) {
      const row = calculateRow(product, { ...INITIAL_SETTINGS, stops });
      const expected = record.quantities[String(stops)];
      equal(row.quantity, expected, `${record.id}/${stops}: exact lookup`);
      equal(row.total, expected === null ? null : expected * 1000, `${record.id}/${stops}: E * G`);
    }
  }

  // Explicit independent golden sums from the supplied rows, not cached zero sums.
  const demoTotals = { 6: [208000, 198000, 406000], 7: [226000, 225000, 451000], 8: [244000, 258000, 502000] };
  const originalTotals = { 6: [55884000, 155721000, 211605000], 7: [58638000, 161471000, 220109000], 8: [61392000, 168941000, 230333000] };
  const sourcePrices = Object.fromEntries(workbook.records.filter((p) => p.currentPrice !== null).map((p) => [p.id, p.currentPrice]));
  for (const stops of SUPPORTED_STOPS) {
    const demo = buildWorkbookComparison(products, { ...INITIAL_SETTINGS, stops });
    equal([demo.subtotals.mechanic, demo.subtotals.startup, demo.total], demoTotals[stops], `Workbook demo SUMIF/SUM ${stops}`);
    const original = buildWorkbookComparison(products, { ...INITIAL_SETTINGS, stops, prices: sourcePrices });
    equal([original.subtotals.mechanic, original.subtotals.startup, original.total], originalTotals[stops], `Original-price SUMIF/SUM ${stops}`);
  }

  // 2. Package membership: the newest client lists (17784 / 19381) fix the row set AND the exact row order.
  const retired = new Set(membership.retired);
  // Older invoices are evidence of the family sets only: P-SEMI-CAM is retired, and the client wants the all-steel cabin last in EVERY package.
  const adapt = (ids) => [...ids.filter((id) => !retired.has(id)), ...membership.closing.filter((id) => !ids.includes(id))];
  for (const invoice of invoices) {
    const capacity = invoice.capacity || "4-6";
    const expected = adapt(invoice.rows.map((row) => row.productId)).sort();
    equal(getPackageProductIds(invoice.packageId, capacity).sort(), expected, `Invoice ${invoice.invoiceNumber}: family membership`);
    for (const row of invoice.rows) equal(byId.has(row.productId) || retired.has(row.productId), true, `Invoice ${invoice.invoiceNumber}/${row.row}: mapped product exists`);
  }
  for (const number of ["17784", "19381"]) {
    const invoice = invoices.find((i) => i.invoiceNumber === number);
    equal(getPackageProductIds(invoice.packageId, "4-6"), adapt(invoice.rows.map((r) => r.productId)), `Invoice ${number}: exact row order`);
  }
  for (const id of retired) equal(byId.has(id), false, `${id}: retired product is not in the catalog`);
  const fullAuto = invoices.find((i) => i.invoiceNumber === "17784");
  equal(getPackageProductIds("rail", "4-6"), fullAuto.rows.slice(48).map((r) => r.productId), "Rail-only extracted from full-auto appendix");
  const semiIds = getPackageProductIds("semi", "4-6");
  equal(semiIds.indexOf("P-MOTOR-7.5") > semiIds.indexOf("P-SEMI-DOOR") && semiIds.indexOf("P-MOTOR-7.5") < semiIds.indexOf("P-SEMI-DICTATOR"), true, "Semi: motor and controller sit between the doors and the dictator");
  equal(semiIds.slice(2, 5), ["R030", "R031", "R032"], "Semi wiring order");
  equal(getPackageProductIds("auto", "4-6").slice(2, 5), ["R031", "R032", "R030"], "Automatic wiring order");
  equal(semiIds.includes("P-SEMI-CAM"), false, "No mechanical cam in the newest semi list");
  const counts = { rail: 10, mechanic: 12, auto: 38, semi: 41, "mech-auto": 49, "mech-semi": 52, "full-auto": 58, "full-semi": 61 };
  const missing = { rail: 9, mechanic: 0, auto: 6, semi: 10, "mech-auto": 6, "mech-semi": 10, "full-auto": 15, "full-semi": 19 };
  const brands = ["\u062f\u0627\u062a\u06cc\u0633", "\u0622\u0631\u06cc\u0646", "\u067e\u0627\u06cc\u0627", "\u0628\u0647\u0631\u0627\u0646", "\u0627\u0644\u06a9\u0648", "ABB"];
  let combinations = 0;
  for (const { value: pack } of PACKAGE_OPTIONS) for (const stops of SUPPORTED_STOPS) for (const capacity of ["4-6", "8"]) for (const motor of ["gearbox", "gearless"]) {
    combinations += 1;
    const settings = { ...INITIAL_SETTINGS, pack, stops, capacity, motor };
    const quote = buildQuote(products, settings);
    equal(quote.rows.length, counts[pack], `${pack}: exact row count`);
    equal(new Set(quote.rows.map((r) => r.product.id)).size, counts[pack], `${pack}: no duplicate invoice row`);
    equal(quote.incompleteRows.length, missing[pack], `${pack}: missing source quantities remain missing`);
    equal(quote.rows.at(-1).product.id, "P-STEEL-CABIN", `${pack}: all-steel cabin is the last row`);
    equal(quote.rows.at(-1).quantity, 1, `${pack}: one all-steel cabin`);
    const motors = quote.rows.filter((r) => r.product.group === "motor");
    equal(motors.length, ["rail", "mechanic"].includes(pack) ? 0 : 1, `${pack}: motor only belongs to startup`);
    if (motors.length) {
      equal(motors[0].product.powerKw, capacity === "8" ? 11 : 7.5, "Client capacity/power rule");
      equal(motors[0].product.brands, brands, "All six motor brands, both powers");
    }
    let expectedTotal = 0;
    for (const row of quote.rows) {
      const record = sourceById.get(row.product.id);
      const expectedQuantity = record ? record.quantities[String(stops)] : row.product.id === "P-STEEL-CABIN" ? 1 : null;
      equal(row.quantity, expectedQuantity, "No capacity or drive-type multiplier invented");
      if (expectedQuantity !== null) expectedTotal += expectedQuantity * 1000;
    }
    equal(quote.total, expectedTotal, "Package total only sums known selected lines");
    equal(Object.values(quote.subtotals).reduce((a, b) => a + b, 0), quote.total, "Category totals reconcile");
    for (const id of membership.workbookOnly) equal(quote.rows.some((r) => r.product.id === id), false, "Workbook-only items are not silently assigned to a PDF package");
  }
  equal(combinations, 96, "8 packages x 3 stops x 2 capacities x 2 drive types");
  for (const id of ["P-CABIN-DOOR", "P-DOOR-MOTOR", "P-RAIL-FASTEN"]) equal(byId.has(id), false, "Remove duplicate/invented legacy rows");
  equal(selectProducts(products, { ...INITIAL_SETTINGS, pack: "semi" }).some((p) => p.id === "R020"), false, "Automatic cabin door must not appear in semi package");

  // 3. Readable numeric rules, not formatting-driven rounding.
  equal(calculateLineTotal(3, 0.333), 0.9990000000000001, "No Math.round absent from Excel");
  equal(calculateLineTotal(0, 1000), 0, "Zero quantity is not missing");
  equal(calculateLineTotal(96, 0), 0, "Zero price is not missing");
  equal(calculateLineTotal(null, 1000), null, "Blank quantity propagates");
  equal(calculateLineTotal(1, null), null, "Blank price propagates");
  equal(calculateLineTotal(-1, 1000), null, "Reject negative quantity");
  equal(calculateLineTotal(Infinity, 1000), null, "Reject infinity");
  equal(comparePrices(null, 1000).ratio, null, "Blank current price");
  equal(comparePrices(1000, null).status, "\u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u06cc\u0633\u0647", "Excel no-comparison state");
  near(comparePrices(1200, 1000).ratio, 0.2, "Excel percent increase");
  near(comparePrices(800, 1000).ratio, -0.2, "Excel percent decrease");
  equal(comparePrices(1000, 1000).status, "\u0628\u062f\u0648\u0646 \u062a\u063a\u06cc\u06cc\u0631", "Excel unchanged state");
  equal(comparePrices(1, 0).ratio, null, "Zero previous price has no percentage");
  equal(comparePrices(0, 1000).ratio, -1, "Zero current price still compares");

  // 4. Overrides are scoped and legacy data is retained, not reset on application load.
  const product = byId.get("M001");
  let manual = updateNumericSetting(INITIAL_SETTINGS, "quantities", "M001", 3);
  equal(calculateRow(product, manual).quantity, 3, "Manual count");
  equal(calculateRow(product, { ...manual, stops: 7 }).quantity, 108, "No leak into another stop");
  equal(calculateRow(product, { ...manual, capacity: "8" }).quantity, 96, "No leak into another capacity");
  equal(calculateRow(product, { ...manual, pack: "mechanic" }).quantity, 96, "No leak into another package");
  equal(calculateRow(product, { ...manual, motor: "gearless" }).quantity, 96, "No leak into another drive type");
  equal(calculateRow(product, updateNumericSetting(manual, "quantities", "M001", null)).quantity, 96, "Clear override restores workbook");
  equal(calculateRow(product, updateNumericSetting(manual, "quantities", "M001", 0)).total, 0, "Manual zero");
  equal(calculateRow(product, { ...manual, excluded: ["M001"] }).total, null, "Excluded line not charged");
  for (const stops of [1, 5, 9, 13]) equal(calculateRow(product, { ...INITIAL_SETTINGS, stops }).quantity, null, "Never extrapolate unsupported stops");
  const legacy = { pack: "mechanic", stops: 7, capacity: "4-6", motor: "gearbox", prices: { M001: 5555 }, quantities: { M001: 23 }, rate: 0 };
  const migrated = parseSettings(legacy);
  equal(migrated.prices.M001, 5555, "Preserve customized master prices");
  equal(calculateRow(product, migrated).quantity, 23, "Migrate legacy count to its own scenario");
  equal(parseSettings(migrated), migrated, "Idempotent schema migration");
  const oldFive = parseSettings({ ...legacy, stops: 5 });
  equal(oldFive.stops, 6, "Old stop 5 becomes UI default 6");
  equal(calculateRow(product, oldFive).quantity, 96, "Old five-stop count is not used for six stops");
  equal(oldFive.quantities[getQuantityOverrideKey("M001", { ...oldFive, stops: 5 })], 23, "Old count retained in backup data");
  throws(() => parseSettings({ pack: "bad" }), "Invalid package rejected");
  equal(parseSettings({ ...legacy, prices: { M001: -5, M002: Infinity } }).prices, {}, "Invalid saved prices rejected");
  const reset = createDemoSettings({ ...migrated, previousPrices: { M001: 4000 }, excluded: ["M001"], customer: "x", customerPhone: "09120000000" });
  equal(getMasterPrice(product, reset), 1000, "Explicit demo reset");
  equal(reset.quantities, {}, "Reset manual counts, not source counts");
  equal(reset.previousPrices, {}, "Reset previous price comparison");
  equal([reset.customer, reset.customerPhone], ["x", "09120000000"], "Demo reset keeps the customer name and phone");
  equal(migrated.prices.M001, 5555, "No mutation of backed-up object");
  for (const power of [7.5, 11]) for (const brand of brands) {
    const motor = byId.get(`P-MOTOR-${power}`);
    const selected = calculateRow(motor, { ...INITIAL_SETTINGS, brands: { [motor.id]: brand } });
    equal(selected.brand, brand, "Selected motor brand preserved");
    equal(selected.unitPrice, 1000, "No hidden brand multiplier in demo");
  }

  const quote = buildQuote(products, { ...INITIAL_SETTINGS, pack: "mechanic" });
  equal(quote.total, 209000, "Mechanic package: 208,000 known lines + one all-steel cabin at the demo price");
  equal(quote.subtotals.cabin, 1000, "Cabin has its own category subtotal");
  equal(parseNumericInput("\u06f1\u06f2\u06f3\u066c\u06f4\u06f5\u06f6\u066b\u06f5"), 123456.5, "Persian numeric input");
  equal(parseNumericInput("\u0661\u0662\u0663"), 123, "Arabic numeric input");
  equal(parseNumericInput(""), null, "Empty number");

  // 4b. Brands: single-model products can never be switched; multi-brand products price per brand.
  const singleModel = ["M010", "M006", "M005", "M004", "M003", "M011", "R032", "R011", "R009", "R010", "R001", "R028", "R034", "R013", "R019", "R008", "R006", "R035",
    "R007", "P-STARTUP-BOLT10", "P-STARTUP-BOLT8", "P-RAIL-BOLT12", "P-RAIL-BOLT10", "P-RAIL-BOLT8", "P-SEMI-DOOR", "P-SEMI-SPRING",
    "P-BRACKET-T5", "P-BRACKET-T9", "P-CLIP-T5", "P-CLIP-T9", "P-STEEL-CABIN"];
  for (const id of singleModel) {
    equal(byId.has(id), true, `${id}: single-model product exists`);
    equal(SINGLE_BRAND_PRODUCT_IDS.has(id), true, `${id}: on the client's single-model list`);
    equal(isBrandSelectable(byId.get(id)), false, `${id}: brand cannot be chosen`);
    equal(isBrandSelectable({ ...byId.get(id), brands: ["A", "B"] }), false, `${id}: still locked even if brands were added later`);
    equal(resolveBrand({ ...byId.get(id), brands: ["A", "B"] }, "B"), "A", `${id}: a saved brand is ignored`);
  }
  for (const power of [7.5, 11]) {
    const motor = byId.get(`P-MOTOR-${power}`);
    equal(isBrandSelectable(motor), true, "Motors have a brand menu");
    const prices = Object.fromEntries(brands.map((brand, index) => [getPriceKey(motor, brand), 5000 + index]));
    brands.forEach((brand, index) => {
      const row = calculateRow(motor, { ...INITIAL_SETTINGS, prices, brands: { [motor.id]: brand } });
      equal([row.brand, row.unitPrice], [brand, 5000 + index], "Changing the brand changes the price to that brand's master price");
    });
    equal(calculateRow(motor, { ...INITIAL_SETTINGS, prices: { [getPriceKey(motor, "ABB")]: 9000 }, brands: { [motor.id]: "\u0622\u0631\u06cc\u0646" } }).unitPrice, 1000, "A brand without its own price is not charged another brand's price");
    equal(calculateRow(motor, { ...INITIAL_SETTINGS, prices: { [motor.id]: 7777 }, brands: { [motor.id]: "ABB" } }).unitPrice, 7777, "Legacy per-product price remains the fallback");
  }
  const twoBrand = { ...byId.get("M001"), brands: ["A", "B"] };
  const brandPrices = { "M001::A": 4000, "M001::B": 5000 };
  equal(calculateRow(twoBrand, { ...INITIAL_SETTINGS, prices: brandPrices, brands: { M001: "B" } }).total, 96 * 5000, "Quantity x price of the chosen brand");
  equal(calculateRow(twoBrand, { ...INITIAL_SETTINGS, prices: brandPrices }).total, 96 * 4000, "First brand is the default");
  equal(calculateRow(byId.get("M003"), { ...INITIAL_SETTINGS, prices: { "M003::\u0627\u0644\u0645\u067e\u06cc\u06a9": 1 } }).unitPrice, 1000, "Single-model products ignore brand price keys");
  equal(products.filter((p) => p.source !== "excel" && Object.keys(p.quantities).length).map((p) => p.id), ["P-STEEL-CABIN"], "Only the steel cabin has a fixed non-workbook quantity");
  const steel = byId.get("P-STEEL-CABIN");
  for (const stops of SUPPORTED_STOPS) {
    const row = calculateRow(steel, { ...INITIAL_SETTINGS, stops });
    equal([row.quantity, row.quantitySource, row.total], [1, "catalog", 1000], `Steel cabin ${stops}`);
    equal(row.quantityReference.includes("\u062a\u0639\u062f\u0627\u062f_\u062a\u0648\u0642\u0641"), false, "Steel cabin never claims a worksheet cell");
  }
  equal(INITIAL_SETTINGS.customerPhone, "", "Customer phone defaults to empty");
  equal(parseSettings({ ...legacy, customerPhone: "09121234567", rate: 30 }).customerPhone, "09121234567", "Customer phone is stored");
  equal("rate" in parseSettings({ ...legacy, rate: 30 }), false, "The removed percentage adjustment is ignored in old saved data");

  // 5. Real persistence functions, with mocked storage/IPC (not a native Rust test).
  const values = new Map();
  global.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  await persistence.saveSettings(migrated);
  equal(await persistence.loadSettings(), migrated, "Browser state round trip");
  for (const version of [1, 2]) {
    equal(await persistence.readBackup({ text: async () => JSON.stringify({ version, state: legacy }) }), migrated, `Backup version ${version}`);
  }
  await assert.rejects(() => persistence.readBackup({ text: async () => JSON.stringify({ version: 99, state: legacy }) })); assertions += 1;
  const mockFolder = path.join(temp, "node_modules/@tauri-apps/api");
  fs.mkdirSync(mockFolder, { recursive: true });
  fs.writeFileSync(path.join(mockFolder, "core.js"), `exports.invoke = async (command, args) => { global.__calls.push({command, args}); if(command === 'save_state') await new Promise(r => setTimeout(r, 2)); };`);
  global.__calls = [];
  global.window = { __TAURI_INTERNALS__: {} };
  await Promise.all([persistence.saveSettings({ ...migrated, customer: "first" }), persistence.saveSettings({ ...migrated, customer: "second" })]);
  equal(global.__calls.map((call) => JSON.parse(call.args.payload).customer), ["first", "second"], "Serialized SQLite saves preserve ordering");
  const settingsWithBrand = { ...INITIAL_SETTINGS, brands: { "P-MOTOR-7.5": "ABB" } };
  const brandQuote = buildQuote(products, settingsWithBrand);
  await persistence.saveQuote(settingsWithBrand, brandQuote);
  const payload = JSON.parse(global.__calls.at(-1).args.payload);
  equal(payload.rows.find((p) => p.id === "P-MOTOR-7.5").brand, "ABB", "Selected brand stored with quote snapshot");
  equal(payload.rows.find((p) => p.id === "M001").quantitySource, "workbook", "Quantity provenance stored with quote");

  console.log(`PASS: ${assertions} assertions; 96 configurations; 248 source formulas; 364 PDF row mappings.`);
  console.log("Test scope: pricing, source tables, BOM families, state migrations, mocked persistence. Native Windows/PDF rendering not tested here.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.rmSync(temp, { recursive: true, force: true });
});
