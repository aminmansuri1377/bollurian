import type { Product, QuoteSettings } from "./types";

export function getMasterPrice(product: Product, settings: QuoteSettings): number | null {
  const price = settings.prices[product.id] ?? product.price;
  return price !== null && Number.isFinite(price) && price >= 0 ? price : null;
}

export function getPreviousPrice(product: Product, settings: QuoteSettings): number | null {
  return settings.previousPrices[product.id] ?? product.previous;
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
