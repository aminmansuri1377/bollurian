import type { PackageId, ProductGroup, QuoteSettings } from "./types";

export const PACKAGE_OPTIONS: { value: PackageId; label: string }[] = [
  { value: "rail", label: "ریل" },
  { value: "mechanic", label: "مکانیک" },
  { value: "auto", label: "راه‌اندازی تمام اتومات" },
  { value: "semi", label: "راه‌اندازی نیمه اتومات" },
  { value: "mech-auto", label: "مکانیک و راه‌اندازی تمام اتومات" },
  { value: "mech-semi", label: "مکانیک و راه‌اندازی نیمه اتومات" },
  { value: "full-auto", label: "ریل، مکانیک و راه‌اندازی تمام اتومات" },
  { value: "full-semi", label: "ریل، مکانیک و راه‌اندازی نیمه اتومات" },
];

// Preserve the existing package rules; this patch changes presentation, not the catalog.
export const PACKAGE_GROUPS: Record<PackageId, ProductGroup[]> = {
  rail: ["rail"],
  mechanic: ["mechanic", "motor"],
  auto: ["startup", "auto", "motor"],
  semi: ["startup", "semi", "motor"],
  "mech-auto": ["mechanic", "motor", "startup", "auto"],
  "mech-semi": ["mechanic", "motor", "startup", "semi"],
  "full-auto": ["rail", "mechanic", "motor", "startup", "auto"],
  "full-semi": ["rail", "mechanic", "motor", "startup", "semi"],
};

export const GROUP_LABELS: Record<ProductGroup, string> = {
  rail: "ریل",
  mechanic: "مکانیک",
  motor: "موتور",
  startup: "راه‌اندازی",
  auto: "تمام اتومات",
  semi: "نیمه اتومات",
};

export const INITIAL_SETTINGS: QuoteSettings = {
  motor: "gearbox",
  stops: 5,
  capacity: "4-6",
  pack: "full-auto",
  prices: {},
  quantities: {},
  brands: {},
  excluded: [],
  customer: "",
  rate: 0,
  quoteNumber: "",
};

export const STORAGE_KEY = "bollourian-state";
export const OMITTED_PRODUCT_ID = "R038";

export function getPackageLabel(packageId: PackageId): string {
  return PACKAGE_OPTIONS.find((option) => option.value === packageId)?.label ?? packageId;
}
