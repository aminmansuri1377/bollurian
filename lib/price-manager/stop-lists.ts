import stopData from "../../data/stop-quantities.json";
import membership from "../../data/reference/package-membership.json";
import { formatNumber } from "./format";
import { getRailFamily } from "./rail-rules";
import type { Capacity, Product, RailFamily, RailKind } from "./types";

export type StartupFamily = "auto" | "semi";

/** One printed invoice ("صفر تا صد") for a stop count: the 4-6 person quantities of every row. */
export interface StopList {
  /** Invoice number the quantities were read from. */
  source: string;
  /** The number in the description of rope 10 (the 24 of "4×24"). */
  ropeLength: number;
  /** Quantity by product ID. A product that is missing here is not part of this list. */
  quantities: Record<string, number>;
  /** Rails, brackets and clips by rail family. */
  rails: Record<RailFamily, Record<RailKind, number>>;
  /** Products that replace a standard row at this stop count (cabin button, gold floor buttons). */
  variants: Record<string, string>;
}

interface CapacityRules {
  ropeMultiplier: Record<Capacity, number>;
  quantities: Record<Capacity, Record<string, number>>;
}

const ROPE_ID = "M001";
const LISTS = stopData.stops as unknown as Record<string, Partial<Record<StartupFamily, StopList>>>;
const CAPACITY_RULES = stopData.capacityRules as CapacityRules;
/** Variant product ID -> the standard row it replaces. */
const STANDARD_ROW: Record<string, string> = Object.fromEntries(
  Object.entries(membership.stopVariants).flatMap(([row, variants]) => variants.map((id) => [id, row])),
);

export function getStopList(stops: number, family: StartupFamily): StopList | undefined {
  return LISTS[String(stops)]?.[family];
}

/** The product a standard row becomes at this stop count (itself unless the list prints a variant). */
export function resolveVariant(list: StopList, productId: string): string {
  return list.variants[productId] ?? productId;
}

/** Whether the printed list contains this standard row. Capacity-rule rows exist in every list. */
export function isListed(list: StopList, productId: string): boolean {
  return productId in list.quantities || productId === ROPE_ID || productId in CAPACITY_RULES.quantities["4-6"] || productId in CAPACITY_RULES.quantities["8"];
}

export interface ListQuantity {
  value: number;
  /** Short explanation appended to the quantity reference. */
  note: string;
}

/**
 * Quantity of one product in a printed list. Client rules by capacity win over the printed column:
 * rope 10 is 4 (or 5 for 8 persons) x the printed length, and a few mechanic rows have fixed counts.
 */
export function getListQuantity(list: StopList, product: Product, capacity: Capacity): ListQuantity | null {
  if (product.rail) return { value: list.rails[getRailFamily(product.rail.type)][product.rail.kind], note: "" };
  const fixed = CAPACITY_RULES.quantities[capacity][product.id];
  if (fixed !== undefined) return { value: fixed, note: capacity === "8" ? " (ویژهٔ ۸ نفر)" : "" };
  if (product.id === ROPE_ID) {
    const multiplier = CAPACITY_RULES.ropeMultiplier[capacity];
    return { value: multiplier * list.ropeLength, note: ` (${formatNumber(multiplier)}×${formatNumber(list.ropeLength)})` };
  }
  const value = list.quantities[STANDARD_ROW[product.id] ?? product.id];
  return value === undefined ? null : { value, note: "" };
}
