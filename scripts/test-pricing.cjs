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

  const { INITIAL_SETTINGS, PACKAGE_OPTIONS, SUPPORTED_STOPS, WORKBOOK_STOPS, DEMO_BASE_PRICE } = load("constants");
  const { PRODUCTS: products } = load("catalog");
  const { calculateRow, calculateLineTotal, buildQuote, buildWorkbookComparison, selectProducts } = load("calculations");
  const { isBrandSelectable, resolveBrand, getPriceKey, SINGLE_BRAND_PRODUCT_IDS } = load("brand-rules");
  const { getPackageProductIds } = load("package-rules");
  const { RAIL_TYPES, DEFAULT_RAIL_SELECTION, normalizeRailSelection, selectRailType, getRailChoices, shouldMergeRailBolts, getRailProductIds } = load("rail-rules");
  const { getQuantityOverrideKey, resolveWorkbookQuantity } = load("quantity-rules");
  const { getMasterPrice, comparePrices } = load("master-price");
  const { parseSettings, updateNumericSetting, createDemoSettings } = load("settings");
  const { parseNumericInput } = load("format");
  const persistence = load("persistence");
  const workbook = readJSON("tests/fixtures/workbook-reference.json");
  const invoices = readJSON("data/reference/invoices.json").invoices;
  const stopInvoices = readJSON("data/reference/stop-invoices.json").invoices;
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
  equal(SUPPORTED_STOPS, [3, 4, 5, 6, 7, 8, 9, 10], "3 to 10 stops: every stop count has the client's printed invoices");
  equal(WORKBOOK_STOPS, [6, 7, 8], "Excel has exactly three stop columns (kept as evidence)");
  equal(stopInvoices.map((i) => `${i.stops}/${i.family}`), ["3/auto", "3/semi", "4/auto", "4/semi", "6/auto", "6/semi", "7/auto", "7/semi", "8/auto", "8/semi", "9/auto", "9/semi", "10/auto", "10/semi"], "14 new invoices: 3, 4, 6, 7, 8, 9 and 10 stops, automatic and semi-automatic");
  equal(INITIAL_SETTINGS.stops, 5, "Default is the fully specified 5-stop list");
  equal(products.length, 85, "84 products plus placeholder");
  equal(new Set(products.map((p) => p.id)).size, products.length, "No duplicate catalog IDs");
  const railDemoPrice = { T5: 1000, T9: 2000, T16: 3000 };
  for (const product of products) equal(product.price, product.rail ? railDemoPrice[product.rail.type] : DEMO_BASE_PRICE, `${product.id}: demo base price (rail parts: one distinct price per type)`);

  // Literal source-cell comparisons: no linear extrapolation or five-stop substitution.
  for (const record of workbook.records) {
    const product = byId.get(record.id);
    equal(product.unit, record.unit, `${record.id}: workbook unit`);
    equal(product.workbookRow, record.masterRow, `${record.id}: row provenance`);
    for (const stops of WORKBOOK_STOPS) {
      const row = calculateRow(product, { ...INITIAL_SETTINGS, stops }, resolveWorkbookQuantity(product, stops));
      const expected = record.quantities[String(stops)];
      equal(row.quantity, expected, `${record.id}/${stops}: exact lookup`);
      equal(row.total, expected === null ? null : expected * 1000, `${record.id}/${stops}: E * G`);
    }
  }

  // Explicit independent golden sums from the supplied rows, not cached zero sums.
  const demoTotals = { 6: [208000, 198000, 406000], 7: [226000, 225000, 451000], 8: [244000, 258000, 502000] };
  const originalTotals = { 6: [55884000, 155721000, 211605000], 7: [58638000, 161471000, 220109000], 8: [61392000, 168941000, 230333000] };
  const sourcePrices = Object.fromEntries(workbook.records.filter((p) => p.currentPrice !== null).map((p) => [p.id, p.currentPrice]));
  for (const stops of WORKBOOK_STOPS) {
    const demo = buildWorkbookComparison(products, { ...INITIAL_SETTINGS, stops });
    equal([demo.subtotals.mechanic, demo.subtotals.startup, demo.total], demoTotals[stops], `Workbook demo SUMIF/SUM ${stops}`);
    const original = buildWorkbookComparison(products, { ...INITIAL_SETTINGS, stops, prices: sourcePrices });
    equal([original.subtotals.mechanic, original.subtotals.startup, original.total], originalTotals[stops], `Original-price SUMIF/SUM ${stops}`);
  }

  // 2. Package membership: the newest client lists (17784 / 19381) fix the row set AND the exact row order.
  const retired = new Set(membership.retired);
  // Older invoices are evidence of the family sets only: P-SEMI-CAM is retired, and the client wants the all-steel cabin last in EVERY package.
  // The all-steel cabin closes only the four packages that contain the startup list (client message 1405/08/12).
  const CABIN_PACKS = new Set(["mech-auto", "mech-semi", "full-auto", "full-semi"]);
  const config = (capacity = "4-6", stops = 5, railTypes = DEFAULT_RAIL_SELECTION) => ({ capacity, stops, railTypes });
  const adapt = (ids, capacity = "4-6", packageId = "full-auto") => [...ids.filter((id) => !retired.has(id) && (CABIN_PACKS.has(packageId) || !membership.closing.includes(id))).map((id) => (capacity === "8" ? membership.capacity8Substitutions[id] ?? id : id)), ...(CABIN_PACKS.has(packageId) ? membership.closing.filter((id) => !ids.includes(id)) : [])];
  for (const invoice of invoices) {
    const capacity = invoice.capacity || "4-6";
    const expected = adapt(invoice.rows.map((row) => row.productId), capacity, invoice.packageId).sort();
    equal(getPackageProductIds(invoice.packageId, config(capacity)).sort(), expected, `Invoice ${invoice.invoiceNumber}: family membership`);
    for (const row of invoice.rows) equal(byId.has(row.productId) || retired.has(row.productId), true, `Invoice ${invoice.invoiceNumber}/${row.row}: mapped product exists`);
  }
  for (const number of ["17784", "19381"]) {
    const invoice = invoices.find((i) => i.invoiceNumber === number);
    for (const row of invoice.rows) {
      if (/^P-(MOTOR|CONTROL)/.test(row.productId)) continue; // brand-dependent names
      equal(byId.get(row.productId).name, row.printedName, `Invoice ${number}/${row.row}: catalog name is the printed name`);
    }
    equal(getPackageProductIds(invoice.packageId, config()), adapt(invoice.rows.map((r) => r.productId), "4-6", invoice.packageId), `Invoice ${number}: exact row order`);
  }
  for (const id of retired) equal(byId.has(id), false, `${id}: retired product is not in the catalog`);
  const fullAuto = invoices.find((i) => i.invoiceNumber === "17784");
  equal(getPackageProductIds("rail", config()), fullAuto.rows.slice(48, -1).map((r) => r.productId), "Rail-only is the rail block of the full-auto list (no cabin)");
  const semiIds = getPackageProductIds("semi", config());
  equal(semiIds.indexOf("P-MOTOR-6.1") > semiIds.indexOf("P-SEMI-DOOR") && semiIds.indexOf("P-MOTOR-6.1") < semiIds.indexOf("P-SEMI-DICTATOR"), true, "Semi: motor and controller sit between the doors and the dictator");
  equal(semiIds.slice(2, 5), ["R030", "R031", "R032"], "Semi wiring order");
  equal(getPackageProductIds("auto", config()).slice(2, 5), ["R031", "R032", "R030"], "Automatic wiring order");
  equal(semiIds.includes("P-SEMI-CAM"), false, "No mechanical cam in the newest semi list");
  // Printed quantity of every standard row ("slot") of the 14 client lists: 5 stops (17784 / 19381) and the 14 new invoices.
  const slotName = (productId) => {
    const part = /^P-(RAIL|BRACKET|CLIP)-T(5|9)$/.exec(productId);
    if (part) return `RAIL:T${part[2]}:${{ RAIL: "rail", BRACKET: "bracket", CLIP: "clip" }[part[1]]}`;
    if (productId.startsWith("P-MOTOR")) return "MOTOR";
    if (productId.startsWith("P-CONTROL")) return "CONTROL";
    return productId === "P-STEEL-CABIN" ? "CABIN" : productId;
  };
  const printedSlots = (stops, family) => stops === 5
    ? Object.fromEntries(invoices.find((i) => i.invoiceNumber === (family === "semi" ? "19381" : "17784")).rows.map((r) => [slotName(r.productId), r.printedQuantity]))
    : Object.fromEntries(stopInvoices.find((i) => i.stops === stops && i.family === family).rows.map((r) => [r.slot, r.printedQuantity]));
  const standardRow = Object.fromEntries(Object.entries(membership.stopVariants).flatMap(([row, variants]) => variants.map((id) => [id, row])));
  // Client rules by capacity (1405/08/12): rope 10 is 4 x (8 persons: 5 x) the number in its description; fixed counts for three mechanic rows.
  const ROPE_LENGTH = { 3: 14, 4: 18, 5: 21, 6: 24, 7: 28, 8: 32, 9: 35, 10: 40 };
  const CAPACITY_COUNTS = { "4-6": { M009: 8, M006: 24, M011: 780 }, "8": { M009: 10, M006: 32, M011: 1000, "P-PULLEY-40X5": 1 } };
  /** Independent expectation of one quantity: printed list + client rules. */
  const expectedQuantity = (stops, family, capacity, product) => {
    const printed = printedSlots(stops, family);
    if (product.rail) return printed[`RAIL:${product.rail.type === "T16" ? "T9" : product.rail.type}:${product.rail.kind}`];
    if (product.id === "M001") return (capacity === "8" ? 5 : 4) * ROPE_LENGTH[stops];
    const fixed = CAPACITY_COUNTS[capacity][product.id];
    if (fixed !== undefined) return fixed;
    const slot = slotName(standardRow[product.id] ?? product.id);
    return ["CABIN", "MOTOR", "CONTROL"].includes(slot) ? 1 : printed[slot];
  };
  const constantOne = new Set(["P-STEEL-CABIN", "P-MOTOR-6.1", "P-MOTOR-7.3", "P-CONTROL-7.5", "P-CONTROL-11", "P-EARTH-WIRE", "P-SEMI-CABIN-DOOR", "P-PULLEY-40X5"]);
  const counts = { rail: 9, mechanic: 11, auto: 37, semi: 40, "mech-auto": 49, "mech-semi": 52, "full-auto": 58, "full-semi": 61 };
  const motorBrands = ["\u0628\u0647\u0631\u0627\u0646", "\u0627\u0644\u06a9\u0648", "ABB"];
  const controlBrands = ["\u062f\u0627\u062a\u06cc\u0633", "\u067e\u0627\u06cc\u0627", "\u0622\u0631\u06cc\u0627\u0646"];
  let combinations = 0;
  for (const { value: pack } of PACKAGE_OPTIONS) for (const stops of SUPPORTED_STOPS) for (const capacity of ["4-6", "8"]) for (const motor of ["gearbox", "gearless"]) {
    combinations += 1;
    const family = pack.includes("semi") ? "semi" : "auto";
    const settings = { ...INITIAL_SETTINGS, pack, stops, capacity, motor };
    const quote = buildQuote(products, settings);
    // Rows the printed list of this stop count does not contain (for example screws-and-plugs in 6-stop list 15587) are not part of the package.
    const printed = printedSlots(stops, family);
    const absent = getPackageProductIds(pack, config(capacity, 5)).filter((id) => !/^P-(RAIL|BRACKET|CLIP)-/.test(id) && id !== "P-STEEL-CABIN" && printed[slotName(standardRow[id] ?? id)] === undefined && !(id in CAPACITY_COUNTS[capacity]) && id !== "M001" && !/^P-(MOTOR|CONTROL)/.test(id) && id !== "P-PULLEY-40X5");
    equal(quote.rows.length, counts[pack] - absent.length, `${pack}/${stops}: exact row count`);
    equal(new Set(quote.rows.map((r) => r.product.id)).size, quote.rows.length, `${pack}/${stops}: no duplicate invoice row`);
    equal(quote.incompleteRows.length, 0, `${pack}/${stops}: nothing blank at any stop count`);
    if (CABIN_PACKS.has(pack)) {
      equal(quote.rows.at(-1).product.id, "P-STEEL-CABIN", `${pack}: all-steel cabin is the last row`);
      equal(quote.rows.at(-1).quantity, 1, `${pack}: one all-steel cabin`);
    } else equal(quote.rows.some((r) => r.product.id === "P-STEEL-CABIN"), false, `${pack}: no all-steel cabin in this package`);
    const motors = quote.rows.filter((r) => r.product.group === "motor");
    equal(motors.length, ["rail", "mechanic"].includes(pack) ? 0 : 1, `${pack}: motor only belongs to startup`);
    if (motors.length) {
      equal(motors[0].product.powerKw, capacity === "8" ? 7.3 : 6.1, "Client motor power rule: 6.1 kW for 4-6 persons, 7.3 kW for 8");
      equal(motors[0].product.brands, motorBrands, "Motor brands: Behran, Elco, ABB");
      const control = quote.rows.find((r) => r.product.id.startsWith("P-CONTROL"));
      equal(control.product.powerKw, capacity === "8" ? 11 : 7.5, "Client controller rule: 7.5 kW for 4-6 persons, 11 kW for 8");
      equal(control.product.brands, controlBrands, "Controller brands: Datis, Paya, Aryan");
    }
    let expectedTotal = 0;
    for (const row of quote.rows) {
      const expected = expectedQuantity(stops, family, capacity, row.product);
      equal(expected !== undefined, true, `${pack}/${stops}/${row.product.id}: the printed list contains this row`);
      equal(row.quantity, expected, `${pack}/${stops}/${capacity}/${row.product.id}: quantity`);
      equal(row.quantitySource, "invoice", `${pack}/${stops}/${row.product.id}: quantities come from the printed invoices`);
      expectedTotal += expected * row.unitPrice;
    }
    equal(quote.total, expectedTotal, "Package total sums every selected line");
    equal(Object.values(quote.subtotals).reduce((a, b) => a + b, 0), quote.total, "Category totals reconcile");
    for (const id of membership.workbookOnly) equal(quote.rows.some((r) => r.product.id === id), false, "Workbook-only items are not silently assigned to a PDF package");
  }
  equal(combinations, 256, "8 packages x 8 stops (3-10) x 2 capacities x 2 drive types");
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
  let manual = updateNumericSetting({ ...INITIAL_SETTINGS, stops: 6 }, "quantities", "M001", 3);
  equal(calculateRow(product, manual).quantity, 3, "Manual count");
  equal(calculateRow(product, { ...manual, stops: 7 }).quantity, 112, "No leak into another stop");
  equal(calculateRow(product, { ...manual, capacity: "8" }).quantity, 120, "No leak into another capacity (8 persons: 5 x 24)");
  equal(calculateRow(product, { ...manual, pack: "mechanic" }).quantity, 96, "No leak into another package");
  equal(calculateRow(product, { ...manual, motor: "gearless" }).quantity, 96, "No leak into another drive type");
  equal(calculateRow(product, updateNumericSetting(manual, "quantities", "M001", null)).quantity, 96, "Clear override restores the printed quantity");
  equal(calculateRow(product, updateNumericSetting(manual, "quantities", "M001", 0)).total, 0, "Manual zero");
  equal(calculateRow(product, { ...manual, excluded: ["M001"] }).total, null, "Excluded line not charged");
  for (const stops of [1, 2, 11, 12, 13, 14]) equal(calculateRow(product, { ...INITIAL_SETTINGS, stops }).quantity, null, "Never extrapolate unsupported stops");
  const legacy = { pack: "mechanic", stops: 7, capacity: "4-6", motor: "gearbox", prices: { M001: 5555 }, quantities: { M001: 23 }, rate: 0 };
  const migrated = parseSettings(legacy);
  equal(migrated.prices.M001, 5555, "Preserve customized master prices");
  equal(Object.keys(migrated.quantities).length, 0, "Old hand-typed counts are dropped: counts are read-only now");
  equal(calculateRow(product, migrated).quantity, 112, "Quantity comes from the printed 7-stop list (4 x 28), not a hidden number");
  equal(parseSettings(migrated), migrated, "Idempotent schema migration");
  const five = parseSettings({ ...legacy, stops: 5 });
  equal(five.stops, 5, "5 stops are supported");
  equal(calculateRow(product, five).quantity, 84, "5 stops read the printed invoice quantity, never a stored number");
  throws(() => parseSettings({ pack: "bad" }), "Invalid package rejected");
  equal(parseSettings({ ...legacy, prices: { M001: -5, M002: Infinity } }).prices, {}, "Invalid saved prices rejected");
  const reset = createDemoSettings({ ...migrated, previousPrices: { M001: 4000 }, excluded: ["M001"], customer: "x", customerPhone: "09120000000" });
  equal(getMasterPrice(product, reset), 1000, "Explicit demo reset");
  equal(reset.quantities, {}, "Reset manual counts, not source counts");
  equal(reset.previousPrices, {}, "Reset previous price comparison");
  equal([reset.customer, reset.customerPhone], ["x", "09120000000"], "Demo reset keeps the customer name and phone");
  equal(migrated.prices.M001, 5555, "No mutation of backed-up object");
  for (const power of [6.1, 7.3]) motorBrands.forEach((brand, index) => {
    const motor = byId.get(`P-MOTOR-${power}`);
    const selected = calculateRow(motor, { ...INITIAL_SETTINGS, brands: { [motor.id]: brand } });
    equal([selected.brand, selected.unitPrice], [brand, 1000 * (index + 1)], "Each motor brand has its own price");
  });

  const quote = buildQuote(products, { ...INITIAL_SETTINGS, pack: "mechanic", stops: 6 });
  equal(quote.total, 976000, "Mechanic package at 6 stops: 976 units at the demo price, no cabin");
  equal(quote.subtotals.cabin, 0, "The mechanic package has no all-steel cabin");
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
  for (const [id, brandList] of [["P-MOTOR-6.1", motorBrands], ["P-MOTOR-7.3", motorBrands], ["P-CONTROL-7.5", controlBrands], ["P-CONTROL-11", controlBrands]]) {
    const item = byId.get(id);
    equal(isBrandSelectable(item), true, `${id}: has a brand menu`);
    equal(item.brands, brandList, `${id}: brand list`);
    const prices = Object.fromEntries(brandList.map((brand, index) => [getPriceKey(item, brand), 5000 + index]));
    brandList.forEach((brand, index) => {
      const row = calculateRow(item, { ...INITIAL_SETTINGS, prices, brands: { [item.id]: brand } });
      equal([row.brand, row.unitPrice], [brand, 5000 + index], "Changing the brand changes the price to that brand's master price");
    });
    equal(calculateRow(item, { ...INITIAL_SETTINGS, prices: { [getPriceKey(item, brandList[2])]: 9000 }, brands: { [item.id]: brandList[1] } }).unitPrice, 2000, "A brand without a custom price keeps ITS OWN catalog price");
    equal(calculateRow(item, { ...INITIAL_SETTINGS, prices: { [item.id]: 7777 }, brands: { [item.id]: brandList[2] } }).unitPrice, 7777, "Legacy per-product price remains the fallback");
    // Data-level guarantee: every brand has its own, different catalog price.
    equal(brandList.every((brand) => typeof item.brandPrices[brand] === "number" && item.brandPrices[brand] > 0), true, `${id}: every brand has a price in the data`);
    equal(new Set(Object.values(item.brandPrices)).size, brandList.length, `${id}: brand prices are all different`);
    equal(Object.keys(item.brandPrices), brandList, `${id}: no price without a brand`);
  }
  for (const p of products) if (p.brands.length > 1 && !SINGLE_BRAND_PRODUCT_IDS.has(p.id)) equal(new Set(Object.values(p.brandPrices)).size, p.brands.length, `${p.id}: every multi-brand product has distinct brand prices`);
  const twoBrand = { ...byId.get("M001"), brands: ["A", "B"] };
  const brandPrices = { "M001::A": 4000, "M001::B": 5000 };
  equal(calculateRow(twoBrand, { ...INITIAL_SETTINGS, stops: 6, prices: brandPrices, brands: { M001: "B" } }).total, 96 * 5000, "Quantity x price of the chosen brand");
  equal(calculateRow(twoBrand, { ...INITIAL_SETTINGS, stops: 6, prices: brandPrices }).total, 96 * 4000, "First brand is the default");
  equal(calculateRow(byId.get("M003"), { ...INITIAL_SETTINGS, prices: { "M003::\u0627\u0644\u0645\u067e\u06cc\u06a9": 1 } }).unitPrice, 1000, "Single-model products ignore brand price keys");
  equal(products.filter((p) => p.source !== "excel" && Object.keys(p.quantities).length).map((p) => p.id).sort(), [...constantOne].sort(), "Only one-per-elevator items keep a catalog quantity next to the printed lists");
  const steel = byId.get("P-STEEL-CABIN");
  for (const stops of SUPPORTED_STOPS) {
    const row = calculateRow(steel, { ...INITIAL_SETTINGS, stops });
    equal([row.quantity, row.total], [1, 1000], `Steel cabin ${stops}`);
    equal(row.quantitySource, "invoice", "Steel cabin source");
    equal(row.quantityReference.includes("\u062a\u0639\u062f\u0627\u062f_\u062a\u0648\u0642\u0641"), false, "Steel cabin never claims a worksheet cell");
  }
  equal(INITIAL_SETTINGS.customerPhone, "", "Customer phone defaults to empty");
  equal(parseSettings({ ...legacy, customerPhone: "09121234567", rate: 30 }).customerPhone, "09121234567", "Customer phone is stored");
  equal("rate" in parseSettings({ ...legacy, rate: 30 }), false, "The removed percentage adjustment is ignored in old saved data");

  // 4c. 5 stops: exactly the printed lists, nothing blank, capacity differences only where the client defined them.
  for (const [pack, number] of [["full-auto", "17784"], ["full-semi", "19381"]]) {
    const invoice = invoices.find((i) => i.invoiceNumber === number);
    const quote5 = buildQuote(products, { ...INITIAL_SETTINGS, pack, stops: 5, capacity: "4-6" });
    equal(quote5.incompleteRows.length, 0, `${number}: nothing blank`);
    invoice.rows.forEach((printedRow, index) => {
      equal([quote5.rows[index].product.id, quote5.rows[index].quantity], [printedRow.productId, printedRow.printedQuantity], `${number} row ${printedRow.row}: id and quantity exactly as printed`);
    });
    equal(quote5.rows.length, invoice.rows.length + (number === "19381" ? 1 : 0), `${number}: same rows, plus the steel cabin where the PDF omits it`);
  }
  for (const pack of ["rail", "mechanic"]) {
    const rows5 = buildQuote(products, { ...INITIAL_SETTINGS, pack, stops: 5 }).rows;
    equal(rows5.every((r) => r.quantity !== null), true, `${pack}: all 5-stop quantities present`);
  }
  const railRows = buildQuote(products, { ...INITIAL_SETTINGS, pack: "rail", stops: 5 }).rows;
  equal(railRows.map((r) => r.quantity), [7, 7, 22, 22, 44, 44, 105, 50, 60], "Rail package at 5 stops (no cabin)");
  const mech = (capacity, stops = 5) => Object.fromEntries(buildQuote(products, { ...INITIAL_SETTINGS, pack: "mechanic", stops, capacity }).rows.map((r) => [r.product.id, r.quantity]));
  equal([mech("4-6").M001, mech("4-6").M009, mech("4-6").M006, mech("4-6").M011, mech("4-6").M008], [84, 8, 24, 780, 1], "4-6 persons mechanic at 5 stops");
  const m8 = mech("8");
  equal([m8.M001, m8.M009, m8.M006, m8.M011, m8["P-PULLEY-40X5"], m8.M008], [105, 10, 32, 1000, 1, undefined], "8 persons mechanic at 5 stops: 40x5 pulley replaces 40x4");
  equal(m8.M002, mech("4-6").M002, "Items the client did not change keep the list quantity");
  equal(mech("8", 6).M001, 120, "8 persons: 5 x the rope length of every stop count (6 stops: 5 x 24)");
  equal(getPackageProductIds("mechanic", config("8")).includes("M008"), false, "8 persons: no 40x4 pulley");
  equal(getPackageProductIds("mechanic", config()).includes("P-PULLEY-40X5"), false, "4-6 persons: no 40x5 pulley");
  const semi5 = buildQuote(products, { ...INITIAL_SETTINGS, pack: "semi", stops: 5 }).rows.find((r) => r.product.id === "R029");
  const auto5 = buildQuote(products, { ...INITIAL_SETTINGS, pack: "auto", stops: 5 }).rows.find((r) => r.product.id === "R029");
  equal([semi5.quantity, auto5.quantity], [27, 30], "Travelling cable differs between the semi (27) and automatic (30) lists");
  equal(semi5.quantityReference.includes("19381") && auto5.quantityReference.includes("17784"), true, "Quantity reference names the invoice");

  // 4d. Rails: two different types out of T5 / T9 / T16; brackets and clips follow; T9 + T16 merge the rail bolts.
  equal(RAIL_TYPES, ["T5", "T9", "T16"], "Three rail types");
  equal(DEFAULT_RAIL_SELECTION, ["T5", "T9"], "Default rails match the printed lists");
  const railParts = products.filter((p) => p.rail);
  equal(railParts.length, 9, "Rail, bracket and clip exist for T5, T9 and T16");
  equal(new Set(railParts.map((p) => p.price)).size >= 3, true, "Rail parts have their own prices");
  for (const kind of ["rail", "bracket", "clip"]) equal(new Set(railParts.filter((p) => p.rail.kind === kind).map((p) => p.price)).size, 3, `${kind}: one different price per type`);
  for (const id of ["P-BRACKET-T16", "P-CLIP-T16", "P-BRACKET-T5", "P-CLIP-T9"]) equal(isBrandSelectable(byId.get(id)), false, `${id}: static row, follows the rail`);
  equal(normalizeRailSelection(["T9", "T9"]), ["T5", "T9"], "Duplicate rails are rejected");
  equal(normalizeRailSelection(["T3", "T9"]), ["T5", "T9"], "Unknown rail type is rejected");
  equal(normalizeRailSelection(undefined), ["T5", "T9"], "Missing selection falls back to the default");
  equal(normalizeRailSelection(["T16", "T5"]), ["T16", "T5"], "A valid selection is kept in order");
  equal(selectRailType(["T5", "T9"], 0, "T9"), ["T9", "T5"], "Choosing the other rail's type swaps instead of repeating");
  equal(selectRailType(["T5", "T9"], 1, "T16"), ["T5", "T16"], "Free type is simply selected");
  equal(getRailChoices(["T5", "T9"], 0), ["T5", "T16"], "First menu hides the type of the second rail");
  equal(getRailChoices(["T5", "T9"], 1), ["T9", "T16"], "Second menu hides the type of the first rail");
  const pairs = RAIL_TYPES.flatMap((a) => RAIL_TYPES.filter((b) => b !== a).map((b) => [a, b]));
  equal(pairs.length, 6, "Six ordered pairs of two different rails");
  for (const pair of pairs) {
    const [a, b] = pair;
    equal(getRailProductIds(pair), [`P-RAIL-${a}`, `P-RAIL-${b}`, `P-BRACKET-${a}`, `P-BRACKET-${b}`, `P-CLIP-${a}`, `P-CLIP-${b}`], `${a}/${b}: brackets and clips follow the rails`);
    const merged = pair.includes("T9") && pair.includes("T16");
    equal(shouldMergeRailBolts(pair), merged, `${a}/${b}: bolt merge rule`);
    for (const pack of ["rail", "full-auto", "full-semi"]) for (const capacity of ["4-6", "8"]) {
      const quote = buildQuote(products, { ...INITIAL_SETTINGS, pack, capacity, railTypes: pair, stops: 5 });
      const ids = quote.rows.map((r) => r.product.id);
      equal(new Set(ids).size, ids.length, `${pack}/${a}/${b}: no duplicate row`);
      equal(quote.incompleteRows.length, 0, `${pack}/${a}/${b}: nothing blank at 5 stops`);
      equal(ids.at(-1) === "P-STEEL-CABIN", pack !== "rail", "Steel cabin stays last where the package has it");
      const start = ids.indexOf(`P-RAIL-${a}`);
      equal(ids.slice(start, start + 6), getRailProductIds(pair), `${pack}/${a}/${b}: rail block order`);
      const bolts = ids.filter((id) => id.startsWith("P-RAIL-BOLT"));
      equal(bolts, merged ? ["P-RAIL-BOLT12"] : ["P-RAIL-BOLT12", "P-RAIL-BOLT10", "P-RAIL-BOLT8"], `${pack}/${a}/${b}: rail bolts`);
      equal(ids.at(pack === "rail" ? -1 - bolts.length : -2 - bolts.length), `P-CLIP-${b}`, "Bolts come right after the clips (and before the steel cabin when there is one)");
      const family = pack === "full-semi" ? "semi" : "auto";
      const kinds = family === "semi" ? { rail: 7, bracket: 24, clip: 48 } : { rail: 7, bracket: 22, clip: 44 };
      const bolt = family === "semi" ? [104, 50, 56] : [105, 50, 60];
      for (const row of quote.rows.filter((r) => r.product.rail)) equal(row.quantity, kinds[row.product.rail.kind], `${a}/${b}/${row.product.id}: count follows the kind of part`);
      equal(quote.rows.find((r) => r.product.id === "P-RAIL-BOLT12").quantity, merged ? bolt[0] + bolt[1] + bolt[2] : bolt[0], `${pack}/${a}/${b}: bolt 12 count`);
      const base = buildQuote(products, { ...INITIAL_SETTINGS, pack, capacity, stops: 5 });
      equal(quote.rows.length, base.rows.length - (merged ? 2 : 0), `${pack}/${a}/${b}: two rows less only when bolts merge`);
    }
  }
  const mergedSix = buildQuote(products, { ...INITIAL_SETTINGS, pack: "rail", railTypes: ["T9", "T16"], stops: 6 });
  equal(mergedSix.rows.find((r) => r.product.id === "P-RAIL-BOLT12").quantity, 132 + 60 + 72, "6 stops: the merged bolt 12 is the sum of the printed 132 + 60 + 72");
  const mergedNine = buildQuote(products, { ...INITIAL_SETTINGS, pack: "full-semi", railTypes: ["T16", "T9"], stops: 9 });
  equal(mergedNine.rows.find((r) => r.product.id === "P-RAIL-BOLT12").quantity, 200 + 80 + 104, "9 stops: 200 + 80 + 104");
  const threeStops = (railTypes) => Object.fromEntries(buildQuote(products, { ...INITIAL_SETTINGS, pack: "rail", railTypes, stops: 3 }).rows.map((r) => [r.product.id, r.quantity]));
  equal([threeStops(["T5", "T9"])["P-RAIL-T5"], threeStops(["T5", "T9"])["P-RAIL-T9"]], [8, 5], "3 stops automatic: the printed rail counts differ per type (T5 8, T9 5)");
  equal(threeStops(["T16", "T5"])["P-RAIL-T16"], 5, "T16 follows the T9 count until the client gives its own");
  const priced = { ...INITIAL_SETTINGS, pack: "rail", railTypes: ["T16", "T5"], stops: 5, prices: { "P-RAIL-T16": 111, "P-BRACKET-T16": 22, "P-CLIP-T16": 3 } };
  const pricedRows = Object.fromEntries(buildQuote(products, priced).rows.map((r) => [r.product.id, r.unitPrice]));
  equal([pricedRows["P-RAIL-T16"], pricedRows["P-BRACKET-T16"], pricedRows["P-CLIP-T16"], pricedRows["P-RAIL-T5"]], [111, 22, 3, 1000], "Each rail part has its own editable master price");
  equal(parseSettings({ ...legacy, railTypes: ["T16", "T9"] }).railTypes, ["T16", "T9"], "Rail choice is saved");
  equal(parseSettings({ ...legacy, railTypes: ["T9", "T9"] }).railTypes, ["T5", "T9"], "Saved duplicate rails are repaired");

  // 4e. The 14 new invoices (3, 4, 6, 7, 8, 9, 10 stops): row set and quantities of the full packages equal the printed rows.
  // Only the client's capacity rules (rope 10, serbokosl, krapi 10, weight) may differ from a printed value.
  const RULE_SLOTS = new Set(["M001", "M009", "M006", "M011"]);
  const IGNORED_SLOTS = new Set(["CAM", "MDF"]); // retired mechanical cam, MDF cabin (replaced by the all-steel cabin)
  const printedCounts = { "15675": { M001: 175 } }; // a 4-6 person list that already prints 5 x 35 for rope 10
  for (const invoice of stopInvoices) {
    const pack = invoice.family === "semi" ? "full-semi" : "full-auto";
    const quote = buildQuote(products, { ...INITIAL_SETTINGS, pack, stops: invoice.stops, capacity: invoice.capacity });
    const engine = new Map(quote.rows.map((r) => [r.product.id === "P-PULLEY-40X5" ? "M008" : slotName(standardRow[r.product.id] ?? r.product.id), r]));
    const printedRows = invoice.rows.filter((r) => !IGNORED_SLOTS.has(r.slot));
    equal([...engine.keys()].sort(), [...new Set([...printedRows.map((r) => r.slot), "CABIN"])].sort(), `${invoice.invoiceNumber}: the package has exactly the printed rows (plus the all-steel cabin)`);
    for (const printedRow of printedRows) {
      if (["MOTOR", "CONTROL", "CABIN"].includes(printedRow.slot)) continue;
      const row = engine.get(printedRow.slot);
      const printed = printedRow.printedQuantity;
      if (RULE_SLOTS.has(printedRow.slot) && row.quantity !== printed) {
        equal(printedRow.slot !== "M001" || invoice.invoiceNumber in printedCounts, true, `${invoice.invoiceNumber}/${printedRow.slot}: only a client rule may replace a printed count`);
        continue;
      }
      equal(row.quantity, printed, `${invoice.invoiceNumber}/${printedRow.slot}: printed ${printedRow.printedName}`);
    }
    equal(engine.get("CABIN").quantity, 1, `${invoice.invoiceNumber}: one all-steel cabin`);
    equal(quote.rows.find((r) => r.product.id === "R022" || r.product.id.startsWith("P-CAB-BTN")).product.name.includes(`${invoice.stops} توقف`), true, `${invoice.invoiceNumber}: the cabin button is the one of this stop count`);
  }
  equal(printedCounts["15675"].M001, 5 * 35, "The 9-stop semi list prints 5 x 35");
  const nine = (family) => buildQuote(products, { ...INITIAL_SETTINGS, pack: family === "semi" ? "full-semi" : "full-auto", stops: 9 }).rows.map((r) => r.product.name);
  equal([nine("auto").includes("شستی طبقه آذرتابش پلکسی طلایی نور آبی"), nine("semi").includes("شستی طبقه آذرتابش پلکسی طلایی نور قرمز")], [true, true], "9 stops: gold floor buttons (blue light automatic, red light semi-automatic)");
  equal(nine("auto").includes("شستی کابین آذرتابش 9 توقف دومتری طلایی"), true, "9 stops: gold two-metre cabin button");

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
  const settingsWithBrand = { ...INITIAL_SETTINGS, stops: 6, brands: { "P-MOTOR-6.1": "ABB" } };
  const brandQuote = buildQuote(products, settingsWithBrand);
  await persistence.saveQuote(settingsWithBrand, brandQuote);
  const payload = JSON.parse(global.__calls.at(-1).args.payload);
  equal(payload.rows.find((p) => p.id === "P-MOTOR-6.1").brand, "ABB", "Selected brand stored with quote snapshot");
  equal(payload.rows.find((p) => p.id === "M001").quantitySource, "invoice", "Quantity provenance stored with quote");

  console.log(`PASS: ${assertions} assertions; ${combinations} configurations; 248 source formulas; 364 PDF row mappings.`);
  console.log("Test scope: pricing, source tables, BOM families, state migrations, mocked persistence. Native Windows/PDF rendering not tested here.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.rmSync(temp, { recursive: true, force: true });
});
