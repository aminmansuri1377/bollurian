import { INITIAL_SETTINGS, isSupportedStop, PACKAGE_OPTIONS } from "./constants";
import { getQuantityOverrideKey } from "./quantity-rules";
import { normalizeRailSelection } from "./rail-rules";
import type { QuoteSettings } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] =>
    typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
  ));
}

/** Preserve legacy custom prices; a demo reset is always explicit and backed up. Legacy `rate` is ignored: the optional adjustment was removed. */
export function parseSettings(value: unknown): QuoteSettings {
  if (!isRecord(value) || !PACKAGE_OPTIONS.some((option) => option.value === value.pack)) {
    throw new Error("Invalid saved settings");
  }
  const oldStop = Number(value.stops);
  const settings: QuoteSettings = {
    ...INITIAL_SETTINGS,
    schemaVersion: 2,
    pack: value.pack as QuoteSettings["pack"],
    motor: value.motor === "gearless" ? "gearless" : "gearbox",
    capacity: value.capacity === "8" ? "8" : "4-6",
    railTypes: normalizeRailSelection(value.railTypes),
    stops: isSupportedStop(oldStop) ? oldStop : INITIAL_SETTINGS.stops,
    customer: typeof value.customer === "string" ? value.customer : "",
    customerPhone: typeof value.customerPhone === "string" ? value.customerPhone : "",
    quoteNumber: typeof value.quoteNumber === "string" ? value.quoteNumber : "",
    prices: readNumberMap(value.prices),
    previousPrices: readNumberMap(value.previousPrices),
    quantities: {},
    brands: isRecord(value.brands)
      ? Object.fromEntries(Object.entries(value.brands).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {},
    excluded: Array.isArray(value.excluded) ? value.excluded.filter((id): id is string => typeof id === "string") : [],
  };
  // Counts are read-only now (printed client invoices). Old hand-typed counts are dropped so a hidden number can never change a quote.
  return settings;
}

export function updateNumericSetting(
  current: QuoteSettings,
  field: "prices" | "previousPrices" | "quantities",
  productId: string,
  value: number | null,
): QuoteSettings {
  const key = field === "quantities" ? getQuantityOverrideKey(productId, current) : productId;
  const values = { ...current[field] };
  if (value === null) delete values[key];
  else if (Number.isFinite(value) && value >= 0) values[key] = value;
  return { ...current, [field]: values };
}

export function createDemoSettings(current: QuoteSettings): QuoteSettings {
  return { ...current, prices: {}, previousPrices: {}, quantities: {}, excluded: [] };
}
