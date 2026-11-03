import membership from "../../data/reference/package-membership.json";
import { PRODUCTS } from "./catalog";
import { isSupportedStop } from "./constants";
import { formatNumber } from "./format";
import { getStartupFamily } from "./package-rules";
import { shouldMergeRailBolts } from "./rail-rules";
import { getListQuantity, getStopList } from "./stop-lists";
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
    return { value: null, source: "missing", reference: "تعداد توقف پشتیبانی نمی‌شود." };
  }
  const manual = settings.quantities[getQuantityOverrideKey(product.id, settings)];
  if (Number.isFinite(manual) && manual >= 0) {
    return { value: manual, source: "manual", reference: "تعداد دستی مخصوص همین پکیج، ظرفیت، موتور و توقف" };
  }
  // Exact printed quantities of the client's invoice for this stop count (automatic or semi-automatic family).
  const list = getStopList(settings.stops, getStartupFamily(settings.pack));
  const printed = list && getListQuantity(list, product, settings.capacity);
  if (list && printed) {
    return { value: printed.value, source: "invoice", reference: `پیش‌فاکتور ${formatNumber(settings.stops)} توقف ${list.source}${printed.note}` };
  }
  return { value: null, source: "missing", reference: `این قلم در پیش‌فاکتور ${formatNumber(settings.stops)} توقف نیست.` };
}

/** The Excel stop table (6, 7 and 8 stops) kept as evidence; the quote itself reads the printed invoices. */
export function resolveWorkbookQuantity(product: Product, stops: number): ResolvedQuantity {
  const value = product.quantities[String(stops)] ?? null;
  if (value === null || !Number.isFinite(value) || value < 0) {
    return { value: null, source: "missing", reference: "فاقد تعداد در جدول اکسل." };
  }
  if (product.workbookRow === undefined) {
    // Not an Excel row: a fixed count recorded in the catalog.
    return { value, source: "catalog", reference: "تعداد ثابت ثبت‌شده در کاتالوگ" };
  }
  const columns: Record<number, string> = { 6: "C", 7: "D", 8: "E" };
  return { value, source: "workbook", reference: `تعداد_توقف!${columns[stops]}${product.workbookRow}` };
}
