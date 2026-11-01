import membership from "../../data/reference/package-membership.json";
import type { Capacity, PackageId, Product } from "./types";

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

export function requiredMotorPower(capacity: Capacity): 7.5 | 11 {
  // Explicit client requirement, NOT a formula inferred from the workbook.
  return capacity === "8" ? 11 : 7.5;
}

export function matchesCapacity(product: Product, capacity: Capacity): boolean {
  return product.powerKw === undefined || product.powerKw === requiredMotorPower(capacity);
}

/**
 * Row order follows the client's newest invoices (17784 automatic, 19381 semi-automatic):
 * mechanic, startup, doors / motor / controller, rail, and the all-steel cabin LAST in every package.
 */
export function getPackageProductIds(packageId: PackageId, capacity: Capacity): string[] {
  const parts = PACKAGE_PARTS[packageId];
  const ids: string[] = [];
  if (parts.mechanic) ids.push(...membership.mechanic);
  if (parts.startup) {
    const power = requiredMotorPower(capacity);
    const motorAndController = [`P-MOTOR-${power}`, `P-CONTROL-${power}`];
    ids.push(...membership.startupHead, ...membership.startupWiring[parts.startup], ...membership.startupTail);
    if (parts.startup === "auto") ids.push(...membership.autoDoors, ...motorAndController);
    else ids.push(...membership.semiDoors, ...motorAndController, ...membership.semiTail);
  }
  if (parts.rail) ids.push(...membership.rail);
  // Do not merge rail bolts with startup bolts: PDFs contain BOTH rows.
  ids.push(...membership.closing);
  return ids;
}

export const WORKBOOK_ONLY_PRODUCT_IDS: readonly string[] = membership.workbookOnly;
