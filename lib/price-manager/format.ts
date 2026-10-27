const integerFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 3 });

export function formatMoney(value: number | null): string {
  return value === null ? "—" : integerFormatter.format(value);
}

export function formatNumber(value: number): string {
  return decimalFormatter.format(value);
}

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/−/g, "-");
}

export function parseNumericInput(value: string): number | null {
  const normalized = normalizeDigits(value);
  if (!normalized.trim()) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
