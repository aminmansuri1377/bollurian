import { isSupportedStop } from "./constants";
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

export function resolveQuantity(product: Product, settings: QuoteSettings): ResolvedQuantity {
  if (!isSupportedStop(settings.stops)) {
    return { value: null, source: "missing", reference: "تعداد توقف خارج از جدول اکسل است." };
  }
  const manual = settings.quantities[getQuantityOverrideKey(product.id, settings)];
  if (Number.isFinite(manual) && manual >= 0) {
    return { value: manual, source: "manual", reference: "تعداد دستی مخصوص همین پکیج، ظرفیت، موتور و توقف" };
  }
  const value = product.quantities[String(settings.stops)] ?? null;
  if (value !== null && Number.isFinite(value) && value >= 0) {
    const columns = { 6: "C", 7: "D", 8: "E" } as const;
    return {
      value,
      source: "workbook",
      reference: `تعداد_توقف!${columns[settings.stops]}${product.workbookRow ?? ""}`,
    };
  }
  // Five-stop invoice snapshots do NOT define six/seven/eight-stop quantities.
  return { value: null, source: "missing", reference: "فاقد تعداد تأییدشده در اکسل؛ مقدار PDF پنج‌توقف تعمیم داده نشده است." };
}
