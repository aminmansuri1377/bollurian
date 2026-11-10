import membership from "../../data/reference/package-membership.json";
import { getRailProductIds, shouldMergeRailBolts } from "./rail-rules";
import { getStopList, isListed, resolveVariant, type StartupFamily } from "./stop-lists";
import type { Capacity, PackageId, Product, QuoteSettings } from "./types";

interface PackageParts {
  mechanic: boolean;
  rail: boolean;
  startup: StartupFamily | null;
  /** The all-steel cabin closes only the four packages that contain the startup list. */
  cabin: boolean;
}

/** Exact equipment-family membership from the invoice row audits (newest client lists take precedence). */
const PACKAGE_PARTS: Record<PackageId, PackageParts> = {
  rail: { mechanic: false, rail: true, startup: null, cabin: false },
  mechanic: { mechanic: true, rail: false, startup: null, cabin: false },
  auto: { mechanic: false, rail: false, startup: "auto", cabin: false },
  semi: { mechanic: false, rail: false, startup: "semi", cabin: false },
  "mech-auto": { mechanic: true, rail: false, startup: "auto", cabin: true },
  "mech-semi": { mechanic: true, rail: false, startup: "semi", cabin: true },
  "full-auto": { mechanic: true, rail: true, startup: "auto", cabin: true },
  "full-semi": { mechanic: true, rail: true, startup: "semi", cabin: true },
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
  // Motors (6.1 / 7.3 kW) and controllers (7.5 / 11 kW) never share a power value, so the power alone identifies the right one.
  return product.powerKw === requiredMotorPower(capacity) || product.powerKw === requiredControllerPower(capacity);
}

/** The startup family that decides which invoice a quantity comes from; packages without startup use the automatic list. */
export function getStartupFamily(packageId: PackageId): StartupFamily {
  return PACKAGE_PARTS[packageId].startup ?? "auto";
}

export function hasRail(packageId: PackageId): boolean {
  return PACKAGE_PARTS[packageId].rail;
}

type PackageConfig = Pick<QuoteSettings, "capacity" | "railTypes" | "stops">;

/**
 * Row order follows the client's newest invoices (17784 automatic, 19381 semi-automatic):
 * mechanic, startup, doors / motor / controller, rail, and the all-steel cabin LAST in the four packages that have it.
 * The printed list of the chosen stop count decides which standard rows exist and which variant (cabin button) is used.
 */
export function getPackageProductIds(packageId: PackageId, { capacity, railTypes, stops }: PackageConfig): string[] {
  const parts = PACKAGE_PARTS[packageId];
  const list = getStopList(stops, getStartupFamily(packageId));
  const substitutions: Record<string, string> = capacity === "8" ? membership.capacity8Substitutions : {};
  const ids: string[] = [];
  if (parts.mechanic) ids.push(...membership.mechanic.map((id) => substitutions[id] ?? id));
  if (parts.startup) {
    const motorAndController = [`P-MOTOR-${requiredMotorPower(capacity)}`, `P-CONTROL-${requiredControllerPower(capacity)}`];
    ids.push(...membership.startupHead, ...membership.startupWiring[parts.startup], ...membership.startupTail);
    if (parts.startup === "auto") ids.push(...membership.autoDoors, ...motorAndController);
    else ids.push(...membership.semiDoors, ...motorAndController, ...membership.semiTail);
  }
  const listed = list ? ids.filter((id) => isListed(list, id)).map((id) => resolveVariant(list, id)) : ids;
  if (parts.rail) {
    // Rails, brackets and clips follow the two chosen rail types. T9 + T16 turn every rail bolt into a bolt 12.
    listed.push(...getRailProductIds(railTypes));
    // Do not merge rail bolts with startup bolts: PDFs contain BOTH rows.
    listed.push(...(shouldMergeRailBolts(railTypes) ? membership.railBolts.slice(0, 1) : membership.railBolts));
  }
  if (parts.cabin) listed.push(...membership.closing);
  return listed;
}

export const WORKBOOK_ONLY_PRODUCT_IDS: readonly string[] = membership.workbookOnly;
