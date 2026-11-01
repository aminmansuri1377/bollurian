import type { RailKind, RailSelection, RailType } from "./types";

export const RAIL_TYPES: readonly RailType[] = ["T5", "T9", "T16"];
export const DEFAULT_RAIL_SELECTION: RailSelection = ["T5", "T9"];

export function isRailType(value: unknown): value is RailType {
  return RAIL_TYPES.some((type) => type === value);
}

/** Two DIFFERENT rail types; anything else falls back to the default. */
export function normalizeRailSelection(value: unknown): RailSelection {
  if (Array.isArray(value) && value.length === 2 && isRailType(value[0]) && isRailType(value[1]) && value[0] !== value[1]) {
    return [value[0], value[1]];
  }
  return [...DEFAULT_RAIL_SELECTION];
}

/** Choose a type for one of the two rails. Picking the other rail's type swaps them, so they never repeat. */
export function selectRailType(current: RailSelection, slot: 0 | 1, type: RailType): RailSelection {
  const next: RailSelection = [...current];
  const other = slot === 0 ? 1 : 0;
  if (next[other] === type) next[other] = next[slot];
  next[slot] = type;
  return next;
}

/** Types offered by one rail's menu: everything except the type the other rail already uses. */
export function getRailChoices(current: RailSelection, slot: 0 | 1): RailType[] {
  const other = current[slot === 0 ? 1 : 0];
  return RAIL_TYPES.filter((type) => type !== other);
}

/** Client rule: only when BOTH T9 and T16 are chosen, the rail bolts 10 and 8 become bolts 12. */
export function shouldMergeRailBolts(selection: RailSelection): boolean {
  return selection.includes("T9") && selection.includes("T16");
}

/** Row order of the rail block: rails, then brackets, then clips, each in the order of the two selected types. */
export function getRailProductIds(selection: RailSelection): string[] {
  const prefix: Record<RailKind, string> = { rail: "P-RAIL", bracket: "P-BRACKET", clip: "P-CLIP" };
  return (Object.keys(prefix) as RailKind[]).flatMap((kind) => selection.map((type) => `${prefix[kind]}-${type}`));
}
