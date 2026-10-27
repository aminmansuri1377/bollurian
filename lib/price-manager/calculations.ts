import { OMITTED_PRODUCT_ID, PACKAGE_GROUPS } from "./constants";
import type { Capacity, Product, QuoteRow, QuoteSettings, QuoteSummary } from "./types";

export function matchesCapacity(product: Product, capacity: Capacity): boolean {
  if (["P-MOTOR-7.5", "P-CONTROL-7.5"].includes(product.id)) return capacity === "4-6";
  if (["P-MOTOR-11", "P-CONTROL-11"].includes(product.id)) return capacity === "8";
  return true;
}

export function selectProducts(products: Product[], settings: QuoteSettings): Product[] {
  return products.filter(
    (product) =>
      product.id !== OMITTED_PRODUCT_ID &&
      PACKAGE_GROUPS[settings.pack].includes(product.group) &&
      matchesCapacity(product, settings.capacity),
  );
}

export function calculateRow(product: Product, settings: QuoteSettings): QuoteRow {
  const quantity = settings.quantities[product.id] ?? product.quantities[String(settings.stops)] ?? null;
  const unitPrice = settings.prices[product.id] ?? product.price;
  const enabled = !settings.excluded.includes(product.id);

  // Original pricing formula, including its existing rounding behavior.
  const total = enabled && quantity !== null && unitPrice !== null
    ? Math.round(quantity * unitPrice * (1 + settings.rate / 100))
    : null;

  return {
    product,
    quantity,
    unitPrice,
    total,
    enabled,
    brand: settings.brands[product.id] ?? product.brands[0] ?? "",
  };
}

export function buildQuote(products: Product[], settings: QuoteSettings): QuoteSummary {
  const rows = selectProducts(products, settings).map((product) => calculateRow(product, settings));
  const enabledRows = rows.filter((row) => row.enabled);
  return {
    rows,
    enabledRows,
    incompleteRows: enabledRows.filter((row) => row.total === null),
    total: enabledRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
  };
}

/** Search changes the visible list, never the quote total or exported items. */
export function searchQuoteRows(rows: QuoteRow[], query: string): QuoteRow[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) =>
    `${row.product.id} ${row.product.name} ${row.brand}`.toLocaleLowerCase().includes(normalized),
  );
}
