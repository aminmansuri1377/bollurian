export type MotorType = "gearbox" | "gearless";
export type Capacity = "4-6" | "8";
export type SupportedStop = 6 | 7 | 8;
export type PackageId =
  | "rail" | "mechanic" | "auto" | "semi"
  | "mech-auto" | "mech-semi" | "full-auto" | "full-semi";
export type ProductGroup = "rail" | "mechanic" | "motor" | "startup" | "auto" | "semi";
export type QuantitySource = "workbook" | "manual" | "missing";
export type TotalCategory = "mechanic" | "startup" | "rail";

export interface Product {
  id: string;
  name: string;
  group: ProductGroup;
  unit: string;
  price: number | null;
  previous: number | null;
  quantities: Record<string, number | null>;
  brands: string[];
  source: string;
  notes: string;
  workbookRow?: number;
  powerKw?: 7.5 | 11;
}

/** Older backups are migrated by parseSettings; never by UI components. */
export interface QuoteSettings {
  schemaVersion: 2;
  motor: MotorType;
  stops: SupportedStop;
  capacity: Capacity;
  pack: PackageId;
  prices: Record<string, number>;
  previousPrices: Record<string, number>;
  /** Keys include motor, package, capacity, stop count and product ID. */
  quantities: Record<string, number>;
  brands: Record<string, string>;
  excluded: string[];
  customer: string;
  rate: number;
  quoteNumber: string;
}

export interface QuoteRow {
  product: Product;
  quantity: number | null;
  quantitySource: QuantitySource;
  quantityReference: string;
  unitPrice: number | null;
  baseTotal: number | null;
  total: number | null;
  enabled: boolean;
  brand: string;
}

export interface QuoteSummary {
  rows: QuoteRow[];
  enabledRows: QuoteRow[];
  incompleteRows: QuoteRow[];
  subtotals: Record<TotalCategory, number>;
  total: number;
}
export type LoadStatus = "loading" | "ready" | "error";
