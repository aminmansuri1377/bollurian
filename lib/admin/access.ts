import { acceptAdminSession, forgetAdminSession } from "../price-manager/admin-session";

export function isNativeAdminRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function normalizeAdminPassword(password: string): string {
  return password.replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

export async function unlockMasterPrices(password: string): Promise<string> {
  const normalized = normalizeAdminPassword(password);
  if (!normalized || [...normalized].length > 128) throw new Error("ADMIN_BAD_PASSWORD");
  if (isNativeAdminRuntime()) {
    const { invoke } = await import("@tauri-apps/api/core");
    // A native error must NEVER fall back to the browser-only development verifier.
    return acceptAdminSession(await invoke<string>("unlock_master_prices", { password: normalized }));
  }
  if (process.env.NODE_ENV === "development") {
    const { unlockDevelopmentAdmin } = await import("./development-access");
    return acceptAdminSession(await unlockDevelopmentAdmin(normalized));
  }
  throw new Error("ADMIN_NATIVE_REQUIRED");
}

export async function lockMasterPrices(token: string): Promise<void> {
  if (isNativeAdminRuntime()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("lock_master_prices", { sessionToken: token });
  }
  forgetAdminSession(token);
}
