import { DEFAULT_RAIL_SELECTION } from "./rail-rules";
import type { PackageId, ProductGroup, QuoteSettings, SupportedStop } from "./types";

export const GEARBOX_PACKAGE_OPTIONS: { value: PackageId; label: string }[] = [
  { value: "rail", label: "ریل" },
  { value: "mechanic", label: "مکانیک" },
  { value: "auto", label: "راه‌اندازی تمام اتومات" },
  { value: "semi", label: "راه‌اندازی نیمه اتومات" },
  { value: "mech-auto", label: "مکانیک و راه‌اندازی تمام اتومات" },
  { value: "mech-semi", label: "مکانیک و راه‌اندازی نیمه اتومات" },
  { value: "full-auto", label: "صفر تا صد تمام اتومات" },
  { value: "full-semi", label: "صفر تا صد نیمه اتومات" },
];

export const GEARLESS_PACKAGE_OPTIONS: { value: PackageId; label: string }[] = [
  { value: "rail", label: "ریل" },
  { value: "gearless-mech-1to1-auto", label: "مکانیک راه اندازی گیرلس دیسکی یک به یک تمام اتومات" },
  { value: "gearless-mech-2to1-auto", label: "مکانیک راه اندازی گیرلس دیسکی دو به یک تمام اتومات" },
  { value: "gearless-mech-mrl-auto", label: "مکانیک راه اندازی گیرلس بشکه ای ( MRL ) تمام اتومات" },
  { value: "gearless-full-1to1-auto", label: "صفرتاصد گیرلس دیسکی یک به یک تمام اتومات" },
  { value: "gearless-full-2to1-auto", label: "صفرتاصد گیرلس دیسکی دو به یک تمام اتومات" },
  { value: "gearless-full-mrl-auto", label: "صفرتاصد گیرلس بشکه ای ( MRL ) تمام اتومات" },
];

/** All valid package IDs. UI filters still expose only the options for the selected motor type. */
export const PACKAGE_OPTIONS: { value: PackageId; label: string }[] = [
  ...GEARBOX_PACKAGE_OPTIONS,
  ...GEARLESS_PACKAGE_OPTIONS.filter((option) => option.value !== "rail"),
];

/** Display order of the groups: list sections and PDF sections follow it. */
export const GROUP_ORDER: readonly ProductGroup[] = ["mechanic", "startup", "rail", "cabin"];

export const GROUP_LABELS: Record<ProductGroup, string> = {
  mechanic: "مکانیک",
  startup: "راه‌اندازی",
  rail: "ریل",
  cabin: "کابین",
};

/** Gearbox phase-1 range stays unchanged. */
export const GEARBOX_STOPS: readonly SupportedStop[] = [3, 4, 5, 6, 7, 8, 9, 10];
/** Gearless phase-2 range requested by the client. */
export const GEARLESS_STOPS: readonly SupportedStop[] = [4, 5, 6, 7, 8, 9, 10, 11, 12];
/** Every stop count accepted by the combined application. */
export const SUPPORTED_STOPS: readonly SupportedStop[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
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
