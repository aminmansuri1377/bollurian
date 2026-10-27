import { INITIAL_SETTINGS, STORAGE_KEY } from "./constants";
import { isRecord, parseSettings } from "./settings";
export { parseSettings } from "./settings";
import type { QuoteSettings, QuoteSummary } from "./types";

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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
        brand: row.brand,
        quantitySource: row.quantitySource,
        quantityReference: row.quantityReference,
        baseTotal: row.baseTotal,
      })),
      total: quote.total,
    }),
  });
}

export function downloadBackup(settings: QuoteSettings): void {
  const payload = { version: 2, createdAt: new Date().toISOString(), state: settings };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bollourian-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<QuoteSettings> {
  const backup: unknown = JSON.parse(await file.text());
  if (!isRecord(backup) || ![1, 2].includes(Number(backup.version))) throw new Error("Unsupported backup version");
  return parseSettings(backup.state);
}