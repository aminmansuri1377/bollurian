import { DEFAULT_RAIL_SELECTION } from "./rail-rules";
import type { PackageId, ProductGroup, QuoteSettings, SupportedStop } from "./types";

export const PACKAGE_OPTIONS: { value: PackageId; label: string }[] = [
  { value: "rail", label: "ریل" },
  { value: "mechanic", label: "مکانیک" },
  { value: "auto", label: "راه‌اندازی تمام اتومات" },
  { value: "semi", label: "راه‌اندازی نیمه اتومات" },
  { value: "mech-auto", label: "مکانیک و راه‌اندازی تمام اتومات" },
  { value: "mech-semi", label: "مکانیک و راه‌اندازی نیمه اتومات" },
  { value: "full-auto", label: "صفر تا صد تمام اتومات" },
  { value: "full-semi", label: "صفر تا صد نیمه اتومات" },
];

export const GROUP_LABELS: Record<ProductGroup, string> = {
  rail: "ریل",
  mechanic: "مکانیک",
  motor: "موتور",
  startup: "راه‌اندازی",
  auto: "تمام اتومات",
  semi: "نیمه اتومات",
  cabin: "کابین",
};

/** Every stop count has the client's printed "صفر تا صد" invoices (automatic and semi-automatic). */
export const SUPPORTED_STOPS: readonly SupportedStop[] = [3, 4, 5, 6, 7, 8, 9];
/** The Excel stop table only has these three columns; it is kept as evidence and for the workbook comparison. */
export const WORKBOOK_STOPS: readonly SupportedStop[] = [6, 7, 8];
export const DEMO_BASE_PRICE = 1000;

export function isSupportedStop(value: number): value is SupportedStop {
  return SUPPORTED_STOPS.some((stop) => stop === value);
}

export const INITIAL_SETTINGS: QuoteSettings = {
  schemaVersion: 2,
  motor: "gearbox",
  stops: 5,
  capacity: "4-6",
  pack: "full-auto",
  railTypes: [...DEFAULT_RAIL_SELECTION],
  prices: {},
  previousPrices: {},
  quantities: {},
  brands: {},
  excluded: [],
  customer: "",
  customerPhone: "",
  quoteNumber: "",
};

export const STORAGE_KEY = "bollourian-state";
export const OMITTED_PRODUCT_ID = "R038";

export function getPackageLabel(packageId: PackageId): string {
  return PACKAGE_OPTIONS.find((option) => option.value === packageId)?.label ?? packageId;
}
