import fiveStop from "../../data/five-stop-quantities.json";
import membership from "../../data/reference/package-membership.json";
import { PRODUCTS } from "./catalog";
import { isSupportedStop } from "./constants";
import { getStartupFamily } from "./package-rules";
import { shouldMergeRailBolts } from "./rail-rules";
import type { Product, QuantitySource, QuoteSettings } from "./types";

type QuantityContext = Pick<QuoteSettings, "motor" | "pack" | "capacity"> & { stops: number };

/** A manual count for one configuration must never leak into another. */
export function getQuantityOverrideKey(productId: string, settings: QuantityContext): string {
  return [settings.motor, settings.pack, settings.capacity, settings.stops, productId].join("|");
}

export interface ResolvedQuantity {
  value: number | null;
  source: QuantitySource;
  reference: string;
}

/** Rail bolts 10 and 8 are removed when T9 + T16 are chosen; bolt 12 then carries all three counts. */
const MERGED_BOLT = membership.railBolts[0];

export function resolveQuantity(product: Product, settings: QuoteSettings): ResolvedQuantity {
  const base = resolveBaseQuantity(product, settings);
  if (product.id !== MERGED_BOLT || !shouldMergeRailBolts(settings.railTypes)) return base;
  const parts = membership.railBolts.map((id) => {
    const bolt = PRODUCTS.find((candidate) => candidate.id === id);
    return bolt && bolt.id !== product.id ? resolveBaseQuantity(bolt, settings) : base;
  });
  if (parts.some((part) => part.value === null)) {
    return { value: null, source: "missing", reference: "مجموع پیچ و مهره ۱۲، ۱۰ و ۸ ریل؛ یکی از تعدادها نامشخص است." };
  }
  return { value: parts.reduce((sum, part) => sum + (part.value ?? 0), 0), source: base.source, reference: `مجموع پیچ و مهره ۱۲، ۱۰ و ۸ ریل (ریل T9 و T16)؛ ${base.reference}` };
}

function resolveBaseQuantity(product: Product, settings: QuoteSettings): ResolvedQuantity {
  if (!isSupportedStop(settings.stops)) {
    return { value: null, source: "missing", reference: "تعداد توقف خارج از جدول اکسل است." };
  }
  const manual = settings.quantities[getQuantityOverrideKey(product.id, settings)];
  if (Number.isFinite(manual) && manual >= 0) {
    return { value: manual, source: "manual", reference: "تعداد دستی مخصوص همین پکیج، ظرفیت، موتور و توقف" };
  }
  if (settings.stops === 5) {
    // Exact printed quantities of the client's 5-stop invoices (17784 automatic, 19381 semi-automatic).
    const family = getStartupFamily(settings.pack);
    const table: Record<string, number> = fiveStop.quantities[family];
    const overrides: Record<string, number> = settings.capacity === "8" ? fiveStop.capacity8 : {};
    // Rail, bracket and clip counts depend on the kind of part, not on the rail type (T5, T9, T16).
    const printed = overrides[product.id] ?? (product.rail ? fiveStop.railKinds[family][product.rail.kind] : table[product.id]);
    if (printed !== undefined) {
      const capacityNote = overrides[product.id] !== undefined ? " (ویژهٔ ۸ نفر)" : "";
      return { value: printed, source: "invoice", reference: `پیش‌فاکتور ۵ توقف ${fiveStop.sources[family]}${capacityNote}` };
    }
    return { value: null, source: "missing", reference: "این قلم در پیش‌فاکتور ۵ توقف نیست." };
  }
  const value = product.quantities[String(settings.stops)] ?? null;
  if (value !== null && Number.isFinite(value) && value >= 0) {
    if (product.workbookRow === undefined) {
      // Not an Excel row (e.g. the all-steel cabin): a fixed count recorded in the catalog.
      return { value, source: "catalog", reference: "تعداد ثابت ثبت‌شده در کاتالوگ بر اساس پیش‌فاکتورهای نمونه" };
    }
    const columns = { 6: "C", 7: "D", 8: "E" } as const;
    return {
      value,
      source: "workbook",
      reference: `تعداد_توقف!${columns[settings.stops]}${product.workbookRow}`,
    };
  }
  // Five-stop invoice snapshots do NOT define six/seven/eight-stop quantities.
  return { value: null, source: "missing", reference: "فاقد تعداد تأییدشده در اکسل؛ مقدار PDF پنج‌توقف تعمیم داده نشده است." };
}
