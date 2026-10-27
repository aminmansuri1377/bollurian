import { INITIAL_SETTINGS, PACKAGE_OPTIONS, STORAGE_KEY } from "./constants";
import type { QuoteSettings, QuoteSummary } from "./types";

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
    ),
  );
}

export function parseSettings(value: unknown): QuoteSettings {
  if (!isRecord(value) || !PACKAGE_OPTIONS.some((option) => option.value === value.pack)) {
    throw new Error("Invalid saved settings");
  }
  const stops = Number(value.stops);
  const rate = Number(value.rate);
  return {
    ...INITIAL_SETTINGS,
    pack: value.pack as QuoteSettings["pack"],
    motor: value.motor === "gearless" ? "gearless" : "gearbox",
    capacity: value.capacity === "8" ? "8" : "4-6",
    stops: Number.isInteger(stops) && stops >= 1 && stops <= 13 ? stops : INITIAL_SETTINGS.stops,
    rate: Number.isFinite(rate) && rate >= -100 ? rate : 0,
    customer: typeof value.customer === "string" ? value.customer : "",
    quoteNumber: typeof value.quoteNumber === "string" ? value.quoteNumber : "",
    prices: readNumberMap(value.prices),
    quantities: readNumberMap(value.quantities),
    brands: isRecord(value.brands)
      ? Object.fromEntries(Object.entries(value.brands).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {},
    excluded: Array.isArray(value.excluded)
      ? value.excluded.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export async function loadSettings(): Promise<QuoteSettings> {
  const raw = isDesktopApp()
    ? await (await import("@tauri-apps/api/core")).invoke<string | null>("load_state")
    : localStorage.getItem(STORAGE_KEY);
  return raw ? parseSettings(JSON.parse(raw)) : { ...INITIAL_SETTINGS };
}

// Serialize native writes so an earlier render cannot overwrite a later edit.
let saveQueue: Promise<void> = Promise.resolve();

export function saveSettings(settings: QuoteSettings): Promise<void> {
  const payload = JSON.stringify(settings);
  const operation = saveQueue.catch(() => undefined).then(async () => {
    if (isDesktopApp()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_state", { payload });
    } else {
      localStorage.setItem(STORAGE_KEY, payload);
    }
  });
  saveQueue = operation;
  return operation;
}

export async function getDatabasePath(): Promise<string> {
  if (!isDesktopApp()) return "";
  return (await import("@tauri-apps/api/core")).invoke<string>("database_path");
}

export async function saveQuote(settings: QuoteSettings, quote: QuoteSummary): Promise<void> {
  if (!isDesktopApp()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await saveQueue;
  await invoke("save_quote", {
    payload: JSON.stringify({
      settings,
      rows: quote.enabledRows.map((row) => ({
        ...row.product,
        qty: row.quantity,
        price: row.unitPrice,
        total: row.total,
        enabled: row.enabled,
      })),
      total: quote.total,
    }),
  });
}

export function downloadBackup(settings: QuoteSettings): void {
  const payload = { version: 1, createdAt: new Date().toISOString(), state: settings };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "bollourian-backup.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<QuoteSettings> {
  const backup: unknown = JSON.parse(await file.text());
  if (!isRecord(backup) || backup.version !== 1) throw new Error("Unsupported backup version");
  return parseSettings(backup.state);
}