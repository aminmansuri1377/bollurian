import type { Product, QuoteSettings, RailSelection, RailType } from "./types";

const RAIL_CHOICES_BY_SLOT: Readonly<Record<0 | 1, readonly RailType[]>> = {
  0: ["T5", "T9"],
  1: ["T9", "T16.T89", "T16.T90"],
};

const RAIL_LABELS: Readonly<Record<RailType, string>> = {
  T5: "ریل چین سرد T5 درجه یک",
  T9: "ریل چین سرد T9 درجه یک",
  "T16.T89": "ریل چین سرد T16.T89 درجه یک",
  "T16.T90": "ریل چین سرد T16.T90 درجه یک",
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

/** Capacity-specific defaults are applied only when the user has not explicitly chosen a brand. */
export function withClientQuoteDefaults(settings: QuoteSettings): QuoteSettings {
  if (settings.capacity !== "8") return settings;

  const brands = { ...settings.brands };
  for (const [productId, brand] of Object.entries(CAPACITY_8_DEFAULT_BRANDS)) {
    if (!brands[productId]) brands[productId] = brand;
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
  if (!(product.id === "R022" || product.id.startsWith("P-CAB-BTN-"))) return brand;
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
