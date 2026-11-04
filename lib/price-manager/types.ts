export type MotorType = "gearbox" | "gearless";
export type Capacity = "4-6" | "8";
export type SupportedStop = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type PackageId =
  | "rail" | "mechanic" | "auto" | "semi"
  | "mech-auto" | "mech-semi" | "full-auto" | "full-semi";
export type ProductGroup = "rail" | "mechanic" | "motor" | "startup" | "auto" | "semi" | "cabin";
export type QuantitySource = "workbook" | "invoice" | "manual" | "catalog" | "missing";
export type RailType = "T5" | "T9" | "T16";
export type RailKind = "rail" | "bracket" | "clip";
/** The two rails of a quote: always two different types. */
export type RailSelection = [RailType, RailType];
export type TotalCategory = "mechanic" | "startup" | "rail" | "cabin";

export interface Product {
  id: string;
  name: string;
  group: ProductGroup;
  unit: string;
  price: number | null;
  /** Base price of each brand when the brand can be chosen; every brand has its own, distinct price. */
  brandPrices?: Record<string, number>;
  previous: number | null;
  quantities: Record<string, number | null>;
  brands: string[];
  source: string;
  notes: string;
  workbookRow?: number;
  powerKw?: 6.1 | 7.3 | 7.5 | 11;
  /** Rail, bracket and clip products: which part it is and for which rail type. */
  rail?: { kind: RailKind; type: RailType };
}

/** Older backups are migrated by parseSettings; never by UI components. */
export interface QuoteSettings {
  schemaVersion: 2;
  motor: MotorType;
  stops: SupportedStop;
  capacity: Capacity;
  pack: PackageId;
  railTypes: RailSelection;
  /** Key: product ID, or `productId::brand` for products whose brand can be chosen. */
  prices: Record<string, number>;
  previousPrices: Record<string, number>;
  /** Keys include motor, package, capacity, stop count and product ID. */
  quantities: Record<string, number>;
  brands: Record<string, string>;
  excluded: string[];
  customer: string;
  customerPhone: string;
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
