import { OMITTED_PRODUCT_ID } from "./constants";
import { getMasterPrice } from "./master-price";
import { getPackageProductIds } from "./package-rules";
import { resolveQuantity } from "./quantity-rules";
import type { Product, QuoteRow, QuoteSettings, QuoteSummary, TotalCategory } from "./types";

export { matchesCapacity } from "./package-rules";

export function selectProducts(products: Product[], settings: QuoteSettings): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return getPackageProductIds(settings.pack, settings.capacity)
    .map((id) => byId.get(id))
    .filter((product): product is Product => !!product && product.id !== OMITTED_PRODUCT_ID);
}

/** Excel H: IF(OR(quantity="", price=""), "", quantity * price). Zero is valid. */
export function calculateLineTotal(quantity: number | null, unitPrice: number | null): number | null {
  if (quantity === null || unitPrice === null) return null;
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0) return null;
  const result = quantity * unitPrice;
  return Number.isFinite(result) ? result : null;
}

/** Existing app-only adjustment; NOT a hidden part of the Excel formula. */
export function applyQuoteAdjustment(baseTotal: number | null, percentage: number): number | null {
  if (baseTotal === null || !Number.isFinite(percentage) || percentage < -100) return null;
  const result = baseTotal * (1 + percentage / 100);
  return Number.isFinite(result) ? result : null;
}

export function calculateRow(product: Product, settings: QuoteSettings): QuoteRow {
  const quantity = resolveQuantity(product, settings);
  const unitPrice = getMasterPrice(product, settings);
  const baseTotal = calculateLineTotal(quantity.value, unitPrice);
  const enabled = !settings.excluded.includes(product.id);
  const savedBrand = settings.brands[product.id];
  const brand = product.brands.includes(savedBrand) ? savedBrand : product.brands[0] ?? "";
  return {
    product,
    quantity: quantity.value,
    quantitySource: quantity.source,
    quantityReference: quantity.reference,
    unitPrice,
    baseTotal,
    // No Math.round: the supplied Excel formula does not round the line total.
    total: enabled ? applyQuoteAdjustment(baseTotal, settings.rate) : null,
    enabled,
    brand,
  };
}

export function getTotalCategory(product: Product): TotalCategory {
  if (product.group === "mechanic") return "mechanic";
  if (product.group === "rail") return "rail";
  return "startup";
}

/** SUMIF-style category totals; never sum numeric-looking labels or placeholder rows. */
export function summarizeRows(rows: QuoteRow[]): QuoteSummary {
  const enabledRows = rows.filter((row) => row.enabled);
  const subtotals: Record<TotalCategory, number> = { mechanic: 0, startup: 0, rail: 0 };
  for (const row of enabledRows) subtotals[getTotalCategory(row.product)] += row.total ?? 0;
  return {
    rows,
    enabledRows,
    incompleteRows: enabledRows.filter((row) => row.total === null),
    subtotals,
    total: enabledRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
  };
}

export function buildQuote(products: Product[], settings: QuoteSettings): QuoteSummary {
  return summarizeRows(selectProducts(products, settings).map((product) => calculateRow(product, settings)));
}

/** A worksheet comparison includes ALL 48 real workbook rows, not a PDF package. */
export function buildWorkbookComparison(products: Product[], settings: QuoteSettings): QuoteSummary {
  const workbookRows = products.filter((product) => product.source === "excel" && product.id !== OMITTED_PRODUCT_ID);
  return summarizeRows(workbookRows.map((product) => calculateRow(product, { ...settings, excluded: [], rate: 0, quantities: {} })));
}

/** Search only affects visibility, never the quote's sums or exported rows. */
export function searchQuoteRows(rows: QuoteRow[], query: string): QuoteRow[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) =>
    `${row.product.id} ${row.product.name} ${row.brand}`.toLocaleLowerCase().includes(normalized),
  );
}
