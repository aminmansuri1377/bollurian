export type MotorType = "gearbox" | "gearless";
export type Capacity = "4-6" | "8";
export type PackageId =
  | "rail"
  | "mechanic"
  | "auto"
  | "semi"
  | "mech-auto"
  | "mech-semi"
  | "full-auto"
  | "full-semi";

export type ProductGroup = "rail" | "mechanic" | "motor" | "startup" | "auto" | "semi";

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
}

/** Field names are kept compatible with the existing SQLite / JSON backups. */
export interface QuoteSettings {
  motor: MotorType;
  stops: number;
  capacity: Capacity;
  pack: PackageId;
  prices: Record<string, number>;
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
  unitPrice: number | null;
  total: number | null;
  enabled: boolean;
  brand: string;
}

export interface QuoteSummary {
  rows: QuoteRow[];
  enabledRows: QuoteRow[];
  incompleteRows: QuoteRow[];
  total: number;
}

export type LoadStatus = "loading" | "ready" | "error";
