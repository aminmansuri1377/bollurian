import type { Product } from "./types";

/**
 * Items the client confirmed exist in exactly ONE model. Their brand can never be chosen,
 * even if a brand list is added to the catalog later. (Client message, 1405/08/10.)
 */
export const SINGLE_BRAND_PRODUCT_IDS: ReadonlySet<string> = new Set([
  "M010", // اشکی گاورنر استیل
  "M006", // کرپی ۱۰
  "M005", // کرپی ۶
  "M004", // پیچ پایه موتور ۱۶
  "M003", // لاستیک تخت
  "M011", // وزنه فلزی ۸۷+
  "R032", // کابل ۴×۱
  "R011", // داکت فلزی ۱۰
  "R009", // داکت نمره ۳ پلاستیکی
  "R010", // داکت نمره ۹ پلاستیکی
  "R001", // استپ قارچی
  "R028", // نوارچسب
  "R034", // علائم استاندارد
  "R013", // لوله خرطومی پلاستیکی
  "R019", // کلید تبدیل
  "R008", // پیچ و رولپلاک
  "R006", // پریز بارانی
  "R035", // گوشی تلفن
  "R007", "P-STARTUP-BOLT10", "P-STARTUP-BOLT8", // پیچ و مهره ۱۲ / ۱۰ / ۸ (راه‌اندازی)
  "P-RAIL-BOLT12", "P-RAIL-BOLT10", "P-RAIL-BOLT8", // پیچ و مهره ۱۲ / ۱۰ / ۸ (ریل)
  "P-SEMI-DOOR", // درب لولایی ۸۰ چپ کرم
  "P-SEMI-SPRING", // فنر درب (در پیام کارفرما «فلز درب»)
  "P-BRACKET-T5", "P-BRACKET-T9", "P-BRACKET-T16", "P-CLIP-T5", "P-CLIP-T9", "P-CLIP-T16", // براکت و لقمه (همنوع ریل)
  "P-STEEL-CABIN", // کابین تمام استیل
]);

/** Products the client confirmed have a single model: their row is static (no menu, no click action). */
export function isSingleModel(product: Product): boolean {
  return SINGLE_BRAND_PRODUCT_IDS.has(product.id);
}

/** A brand menu exists only for products with at least two brands that are not on the single-model list. */
export function isBrandSelectable(product: Product): boolean {
  return !isSingleModel(product) && product.brands.length > 1;
}

export function resolveBrand(product: Product, savedBrand: string | undefined): string {
  if (isBrandSelectable(product) && savedBrand !== undefined && product.brands.includes(savedBrand)) return savedBrand;
  return product.brands[0] ?? "";
}

/** Settings key of a master price: one price per brand when the brand is selectable. */
export function getPriceKey(product: Product, brand: string): string {
  return isBrandSelectable(product) && brand ? `${product.id}::${brand}` : product.id;
}
