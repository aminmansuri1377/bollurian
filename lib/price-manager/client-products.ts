import { PRODUCTS } from "./catalog";
import type { Product } from "./types";

const HIDDEN_PRODUCT_IDS: ReadonlySet<string> = new Set([
  "P-STEEL-CABIN",
]);

type ProductOverride = Pick<Partial<Product>, "name" | "brands" | "brandPrices">;

/**
 * Client-requested presentation/catalog changes layered on top of the audited source catalog.
 * The source JSON and all pricing/quantity formulas stay untouched.
 */
const PRODUCT_OVERRIDES: Readonly<Record<string, ProductOverride>> = {
  R022: {
    // 5-stop cabin button: both client-approved models are one metre.
    brands: ["مدیا 5 یک متری نور قرمز", "آذرتابش 5 یک متری نقره‌ای"],
    brandPrices: {
      "مدیا 5 یک متری نور قرمز": 1000,
      "آذرتابش 5 یک متری نقره‌ای": 2000,
    },
  },
  R020: { name: "درب فول کابین 80 چپ دو لته" },
  "P-FLOOR-BTN-GOLD-BLUE": {
    name: "شستی طبقه",
    brands: ["G07 مدیا نور آبی", "آذرتابش پلکسی نقره‌ای نور آبی"],
    brandPrices: { "G07 مدیا نور آبی": 1000, "آذرتابش پلکسی نقره‌ای نور آبی": 2000 },
  },
  "P-FLOOR-BTN-GOLD-RED": {
    name: "شستی طبقه",
    brands: ["G07 مدیا نور آبی", "آذرتابش پلکسی نقره‌ای نور آبی"],
    brandPrices: { "G07 مدیا نور آبی": 1000, "آذرتابش پلکسی نقره‌ای نور آبی": 2000 },
  },
  "P-MOTOR-6.1": { name: "موتور 6.1 کیلووات تک‌سرعته" },
  "P-MOTOR-7.3": { name: "موتور 7.3 کیلووات تک‌سرعته" },
  "P-CONTROL-7.5": { name: "تابلو فرمان 7.5 کیلووات" },
  "P-CONTROL-11": { name: "تابلو فرمان 11 کیلووات" },
  "P-RAIL-T5": { name: "ریل T5 چین سرد درجه یک" },
  "P-RAIL-T9": { name: "ریل T9 چین سرد درجه یک" },
  "P-RAIL-T16.T89": { name: "ریل T16.T89 چین سرد درجه یک" },
  "P-RAIL-T16.T90": { name: "ریل T16.T90 چین سرد درجه یک" },
  R002: {
    brands: ["زیرکابینی توربوسل", "مگنتی تکسل", "سیم بکسل توربوسل"],
    brandPrices: {
      "زیرکابینی توربوسل": 1000,
      "مگنتی تکسل": 2000,
      "سیم بکسل توربوسل": 3000,
    },
  },
  R016: {
    brands: ["پیشرو پلاستیکی با آهنربا", "فلزی راینو", "پیشرو فلزی با آهنربا"],
    brandPrices: {
      "پیشرو پلاستیکی با آهنربا": 1000,
      "فلزی راینو": 2000,
      "پیشرو فلزی با آهنربا": 3000,
    },
  },
  R036: {
    brands: ["بلوریان", "لیفت گارو"],
    brandPrices: { بلوریان: 1000, "لیفت گارو": 2000 },
  },
  R037: {
    brands: ["بلوریان", "لیفت گارو"],
    brandPrices: { بلوریان: 1000, "لیفت گارو": 2000 },
  },
  "P-SEMI-DICTATOR": {
    name: "دیکتاتور",
    brands: ["سپاهان", "جان لیفت", "IRT"],
    brandPrices: { سپاهان: 1000, "جان لیفت": 2000, IRT: 3000 },
  },
  "P-SEMI-LOCK": {
    name: "قفل چپ",
    brands: ["تاپ لیفت", "بهران", "ژیان لیفت"],
    brandPrices: { "تاپ لیفت": 1000, بهران: 2000, "ژیان لیفت": 3000 },
  },
  "P-BRACKET-T16.T89": { name: "براکت T16" },
  "P-BRACKET-T16.T90": { name: "براکت T16" },
  "P-CLIP-T16.T89": { name: "لقمه T16" },
  "P-CLIP-T16.T90": { name: "لقمه T16" },
};

function applyOverride(product: Product): Product {
  const override = PRODUCT_OVERRIDES[product.id];
  if (!override) return product;
  return {
    ...product,
    ...override,
    brands: override.brands ? [...override.brands] : product.brands,
    brandPrices: override.brandPrices ? { ...override.brandPrices } : product.brandPrices,
  };
}

/** Products used by the actual desktop app. Hidden products remain in the audited source catalog. */
export const CLIENT_PRODUCTS: Product[] = PRODUCTS
  .filter((product) => !HIDDEN_PRODUCT_IDS.has(product.id))
  .map(applyOverride);
