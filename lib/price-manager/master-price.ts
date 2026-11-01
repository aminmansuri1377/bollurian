import { getPriceKey, resolveBrand } from "./brand-rules";
import type { Product, QuoteSettings } from "./types";

function readPrice(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Base price of one brand: its own catalog price, else the product base price. */
export function getBaseBrandPrice(product: Product, brand: string): number | null {
  return readPrice(product.brandPrices?.[brand] ?? product.price);
}

/** Brand-specific master price; falls back to the legacy per-product price, then the brand's catalog price. */
export function getMasterPrice(product: Product, settings: QuoteSettings, brand = resolveBrand(product, settings.brands[product.id])): number | null {
  return readPrice(settings.prices[getPriceKey(product, brand)] ?? settings.prices[product.id] ?? getBaseBrandPrice(product, brand));
}

export function getPreviousPrice(product: Product, settings: QuoteSettings, brand = resolveBrand(product, settings.brands[product.id])): number | null {
  return settings.previousPrices[getPriceKey(product, brand)] ?? settings.previousPrices[product.id] ?? product.previous;
}

/** Excel G: current / previous - 1. The result is a ratio (0.2 = 20%). */
export function comparePrices(current: number | null, previous: number | null) {
  if (current === null || previous === null) {
    return { ratio: null, status: "بدون مقایسه" };
  }
  const status = current > previous ? "افزایش" : current < previous ? "کاهش" : "بدون تغییر";
  // Excel would divide by zero here. Keep the status, but no invalid percentage.
  return { ratio: previous === 0 ? null : current / previous - 1, status };
}
