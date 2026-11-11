import type { Product, QuoteSettings, RailSelection, RailType } from "./types";

const RAIL_CHOICES_BY_SLOT: Readonly<Record<0 | 1, readonly RailType[]>> = {
  0: ["T5", "T9"],
  1: ["T9", "T16.T89", "T16.T90"],
};

const RAIL_LABELS: Readonly<Record<RailType, string>> = {
  T5: "ریل T5 چین سرد درجه یک",
  T9: "ریل T9 چین سرد درجه یک",
  "T16.T89": "ریل T16.T89 چین سرد درجه یک",
  "T16.T90": "ریل T16.T90 چین سرد درجه یک",
};

const CLIENT_DEFAULT_BRANDS: Readonly<Record<string, string>> = {
  // Keep the original catalog key so existing brand prices/backups remain compatible; only the visible label is one metre.
  "P-CAB-BTN-9": "مدیا 9 دومتری نور قرمز",
};

const CAPACITY_8_DEFAULT_BRANDS: Readonly<Record<string, string>> = {
  R002: "سیم بکسل توربوسل",
  R016: "پیشرو فلزی با آهنربا",
};

export function normalizeClientRailSelection(selection: RailSelection): RailSelection {
  let first = RAIL_CHOICES_BY_SLOT[0].includes(selection[0]) ? selection[0] : "T5";
  let second = RAIL_CHOICES_BY_SLOT[1].includes(selection[1]) ? selection[1] : "T9";

  if (first === second) {
    if (first === "T9") second = "T16.T89";
    else first = "T5";
  }
  return [first, second];
}

export function getClientRailChoices(slot: 0 | 1): RailType[] {
  return [...RAIL_CHOICES_BY_SLOT[slot]];
}

export function selectClientRailType(current: RailSelection, slot: 0 | 1, type: RailType): RailSelection {
  const normalized = normalizeClientRailSelection(current);
  if (!RAIL_CHOICES_BY_SLOT[slot].includes(type)) return normalized;

  let [first, second] = normalized;
  if (slot === 0) {
    first = type;
    if (first === second) second = "T16.T89";
  } else {
    second = type;
    if (first === second) first = "T5";
  }
  return [first, second];
}

export function getClientRailLabel(type: RailType): string {
  return RAIL_LABELS[type];
}

/** Client defaults are applied only when the user has not explicitly chosen a brand. */
export function withClientQuoteDefaults(settings: QuoteSettings): QuoteSettings {
  const brands = { ...settings.brands };

  for (const [productId, brand] of Object.entries(CLIENT_DEFAULT_BRANDS)) {
    if (!brands[productId]) brands[productId] = brand;
  }

  if (settings.capacity === "8") {
    for (const [productId, brand] of Object.entries(CAPACITY_8_DEFAULT_BRANDS)) {
      if (!brands[productId]) brands[productId] = brand;
    }
  }

  return { ...settings, brands };
}

/** With exactly three brands, keep the active/default brand in the middle of the selector. */
export function getClientBrandOptions(product: Product, activeBrand: string): string[] {
  const brands = [...product.brands];
  if (brands.length !== 3) return brands;

  const capacityDefault = CAPACITY_8_DEFAULT_BRANDS[product.id];
  const defaultBrand = capacityDefault && activeBrand === capacityDefault ? capacityDefault : brands[0];
  const defaultIndex = brands.indexOf(defaultBrand);
  if (defaultIndex !== 1) [brands[1], brands[defaultIndex]] = [brands[defaultIndex], brands[1]];
  return brands;
}

function formatVisibleBrand(product: Product, brand: string): string {
  // The word «فول» belongs to the cabin-door product name, not to the Ravankar brand.
  if ((product.id === "R020" || product.id === "P-LANDING-DOOR") && brand === "روانکار فول") return "روانکار";

  // The 5-stop cabin-button models are explicitly one metre. Keep these labels stable even in old saved data.
  if (product.id === "R022") {
    if (brand.startsWith("مدیا")) return "مدیا 5 توقف یک متری نور قرمز";
    if (brand.startsWith("آذرتابش")) return "آذرتابش 5 توقف یک متری نقره‌ای";
  }

  // The 9-stop cabin-button models are also one metre; keep stored price keys unchanged and fix only their visible label.
  if (product.id === "P-CAB-BTN-9") {
    if (brand.startsWith("مدیا")) return "مدیا 9 توقف یک متری نور قرمز";
    if (brand.startsWith("آذرتابش")) return "آذرتابش 9 توقف یک متری طلایی";
  }

  if (!product.id.startsWith("P-CAB-BTN-")) return brand;
  if (/\d+\s*توقف/.test(brand)) return brand;
  return brand.replace(/(\d+)(?=\s)/, "$1 توقف");
}

/** Dropdown option: shared product name first, then this brand/model. */
export function formatClientBrandLabel(product: Product, brand: string): string {
  const visibleBrand = formatVisibleBrand(product, brand);
  return `${product.name} ${visibleBrand}`.trim();
}

/** Main list/PDF label: product name first, then the selected brand/model. */
export function formatClientProductName(product: Product, brand: string): string {
  if (!brand) return product.name;
  const visibleBrand = formatVisibleBrand(product, brand);
  return `${product.name} ${visibleBrand}`.trim();
}
