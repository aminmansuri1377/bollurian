/* Domain regression tests: no browser, Tauri runtime, or extra test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bollurian-tests-"));
let assertions = 0;

function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  assertions += 1;
}

try {
  for (const name of ["types", "constants", "calculations", "format", "persistence"]) {
    const fileName = path.join(root, "lib", "price-manager", `${name}.ts`);
    const compiled = ts.transpileModule(fs.readFileSync(fileName, "utf8"), {
      fileName,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    fs.writeFileSync(path.join(temporaryDirectory, `${name}.js`), compiled.outputText);
  }

  const { INITIAL_SETTINGS, PACKAGE_GROUPS } = require(path.join(temporaryDirectory, "constants.js"));
  const { buildQuote, calculateRow, selectProducts, searchQuoteRows } = require(path.join(temporaryDirectory, "calculations.js"));
  const { parseNumericInput } = require(path.join(temporaryDirectory, "format.js"));
  const { parseSettings } = require(path.join(temporaryDirectory, "persistence.js"));
  const products = JSON.parse(fs.readFileSync(path.join(root, "data/catalog.json"), "utf8"));

  for (const pack of Object.keys(PACKAGE_GROUPS)) {
    for (let stops = 1; stops <= 13; stops += 1) {
      for (const capacity of ["4-6", "8"]) {
        const settings = { ...INITIAL_SETTINGS, pack, stops, capacity };
        const baseline = products.filter((product) => {
          if (!PACKAGE_GROUPS[pack].includes(product.group) || product.id === "R038") return false;
          if (["P-MOTOR-7.5", "P-CONTROL-7.5"].includes(product.id)) return capacity === "4-6";
          if (["P-MOTOR-11", "P-CONTROL-11"].includes(product.id)) return capacity === "8";
          return true;
        });
        equal(selectProducts(products, settings).map((product) => product.id), baseline.map((product) => product.id), "Package and capacity filtering changed");
        const expectedTotal = baseline.reduce((sum, product) => {
          const quantity = product.quantities[String(stops)] ?? null;
          return sum + (quantity !== null && product.price !== null ? Math.round(quantity * product.price) : 0);
        }, 0);
        equal(buildQuote(products, settings).total, expectedTotal, "Original total changed");
      }
    }
  }

  const product = products.find((item) => item.id === "M001");
  const customized = { ...INITIAL_SETTINGS, prices: { M001: 1000 }, quantities: { M001: 3 }, rate: 7.5 };
  equal(calculateRow(product, customized).total, 3225, "Rate formula");
  equal(calculateRow(product, { ...customized, prices: { M001: 0 } }).total, 0, "Zero price is not missing");
  equal(calculateRow(product, { ...customized, quantities: { M001: 0 } }).total, 0, "Zero quantity is not missing");
  equal(calculateRow(product, { ...customized, excluded: ["M001"] }).total, null, "Exclusion");
  equal(calculateRow({ ...product, quantities: {}, price: null }, INITIAL_SETTINGS).total, null, "Unknown inputs must not become zero");
  equal(calculateRow(product, { ...customized, rate: -100 }).total, 0, "Full discount");

  const quote = buildQuote(products, { ...INITIAL_SETTINGS, pack: "mechanic", stops: 6 });
  const originalTotal = quote.total;
  equal(searchQuoteRows(quote.rows, "no-such-product").length, 0, "Empty search");
  equal(quote.total, originalTotal, "Search must not change exported totals");
  equal(parseNumericInput("۱۲۳٬۴۵۶٫۵"), 123456.5, "Persian digits");
  equal(parseNumericInput("١٢٣"), 123, "Arabic digits");
  equal(parseNumericInput(""), null, "Empty numeric input");
  equal(parseNumericInput("invalid"), null, "Invalid numeric input");
  equal(parseSettings(JSON.parse(JSON.stringify(customized))), customized, "Legacy stored state compatibility");
  assert.throws(() => parseSettings({ pack: "not-a-package" }));
  assertions += 1;
  console.log(`PASS: ${assertions} assertions, including all 208 package/stop/capacity combinations.`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
