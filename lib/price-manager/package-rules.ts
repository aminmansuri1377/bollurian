import membership from "../../data/reference/package-membership.json";
import { DEFAULT_RAIL_SELECTION, getRailProductIds, shouldMergeRailBolts } from "./rail-rules";
import type { Capacity, PackageId, Product, RailSelection } from "./types";

/** Exact equipment-family membership from the invoice row audits (newest client lists take precedence). */
const PACKAGE_PARTS: Record<PackageId, { mechanic: boolean; rail: boolean; startup: "auto" | "semi" | null }> = {
  rail: { mechanic: false, rail: true, startup: null },
  mechanic: { mechanic: true, rail: false, startup: null },
  auto: { mechanic: false, rail: false, startup: "auto" },
  semi: { mechanic: false, rail: false, startup: "semi" },
  "mech-auto": { mechanic: true, rail: false, startup: "auto" },
  "mech-semi": { mechanic: true, rail: false, startup: "semi" },
  "full-auto": { mechanic: true, rail: true, startup: "auto" },
  "full-semi": { mechanic: true, rail: true, startup: "semi" },
};

/** Client rule: 4-6 persons use a 6.1 kW motor, 8 persons a 7.3 kW motor (brands Behran, Elco, ABB). */
export function requiredMotorPower(capacity: Capacity): 6.1 | 7.3 {
  return capacity === "8" ? 7.3 : 6.1;
}

/** Client rule: 4-6 persons use a 7.5 kW controller, 8 persons an 11 kW one (brands Datis, Paya, Aryan). */
export function requiredControllerPower(capacity: Capacity): 7.5 | 11 {
  return capacity === "8" ? 11 : 7.5;
}

export function matchesCapacity(product: Product, capacity: Capacity): boolean {
  if (product.powerKw === undefined) return true;
  return product.powerKw === (product.group === "motor" ? requiredMotorPower(capacity) : requiredControllerPower(capacity));
}

/** The startup family that decides which invoice a quantity comes from; packages without startup use the automatic list. */
export function getStartupFamily(packageId: PackageId): "auto" | "semi" {
  return PACKAGE_PARTS[packageId].startup ?? "auto";
}

/**
 * Row order follows the client's newest invoices (17784 automatic, 19381 semi-automatic):
 * mechanic, startup, doors / motor / controller, rail, and the all-steel cabin LAST in every package.
 */
export function hasRail(packageId: PackageId): boolean {
  return PACKAGE_PARTS[packageId].rail;
}

export function getPackageProductIds(packageId: PackageId, capacity: Capacity, railTypes: RailSelection = DEFAULT_RAIL_SELECTION): string[] {
  const parts = PACKAGE_PARTS[packageId];
  const ids: string[] = [];
  const substitutions: Record<string, string> = capacity === "8" ? membership.capacity8Substitutions : {};
  if (parts.mechanic) ids.push(...membership.mechanic.map((id) => substitutions[id] ?? id));
  if (parts.startup) {
    const motorAndController = [`P-MOTOR-${requiredMotorPower(capacity)}`, `P-CONTROL-${requiredControllerPower(capacity)}`];
    ids.push(...membership.startupHead, ...membership.startupWiring[parts.startup], ...membership.startupTail);
    if (parts.startup === "auto") ids.push(...membership.autoDoors, ...motorAndController);
    else ids.push(...membership.semiDoors, ...motorAndController, ...membership.semiTail);
  }
  if (parts.rail) {
    // Rails, brackets and clips follow the two chosen rail types. T9 + T16 turn every rail bolt into a bolt 12.
    ids.push(...getRailProductIds(railTypes));
    // Do not merge rail bolts with startup bolts: PDFs contain BOTH rows.
    ids.push(...(shouldMergeRailBolts(railTypes) ? membership.railBolts.slice(0, 1) : membership.railBolts));
  }
  ids.push(...membership.closing);
  return ids;
}

export const WORKBOOK_ONLY_PRODUCT_IDS: readonly string[] = membership.workbookOnly;
