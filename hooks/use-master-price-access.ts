"use client";

import { useEffect, useRef, useState } from "react";
import { lockMasterPrices, unlockMasterPrices } from "@/lib/admin/access";
import { adminErrorMessage } from "@/lib/admin/messages";
import { forgetAdminSession } from "@/lib/price-manager/admin-session";
import { flushSettingsWrites, saveSettings } from "@/lib/price-manager/persistence";
import type { QuoteSettings } from "@/lib/price-manager/types";

export type AdminAction = "prices" | "reset";
type Phase = "password" | "prices" | "reset" | "closing" | "close-error";

interface AdminAccessOptions {
  action: AdminAction;
  settings: QuoteSettings;
  onResetDemo: () => void;
  onClose: () => void;
}

/** The gate owns a session, but never changes a formula or a price itself. */
export function useMasterPriceAccess({ action, settings, onResetDemo, onClose }: AdminAccessOptions) {
  const [phase, setPhase] = useState<Phase>("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const submitting = useRef(false);
  const closing = useRef(false);
  const resetStarted = useRef(false);
  const token = useRef<string | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const currentToken = token.current;
      if (currentToken) {
        // Normal close waits for an explicit save below. This is only an unexpected-unmount fallback.
        void flushSettingsWrites().catch(() => undefined)
          .then(() => lockMasterPrices(currentToken))
          .catch(() => forgetAdminSession(currentToken));
      }
    };
  }, []);

  async function authenticate(password: string) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const issuedToken = await unlockMasterPrices(password);
      if (!alive.current) {
        await lockMasterPrices(issuedToken).catch(() => forgetAdminSession(issuedToken));
        return;
      }
      token.current = issuedToken;
      setPhase(action === "reset" ? "reset" : "prices");
    } catch (failure) {
      if (alive.current) setError(adminErrorMessage(failure));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  // Run the original confirmation/backup/reset callback, unmodified.
  // Closing is a separate React commit, so it saves the NEW settings, not a stale snapshot.
  useEffect(() => {
    if (phase !== "reset" || resetStarted.current) return;
    resetStarted.current = true;
    try { onResetDemo(); }
    finally { setPhase("closing"); }
  }, [phase, onResetDemo]);

  useEffect(() => {
    if (phase !== "closing" || closing.current) return;
    closing.current = true;
    async function finish() {
      const currentToken = token.current;
      if (!currentToken) { onClose(); return; }
      try {
        await saveSettings(settings);
        await flushSettingsWrites();
        await lockMasterPrices(currentToken);
        token.current = null;
        if (alive.current) onClose();
      } catch {
        if (alive.current) {
          setError("ذخیره اطلاعات یا قفل‌کردن مدیریت کامل نشد. دوباره تلاش کنید؛ تغییرات هنوز در صفحه حفظ شده‌اند.");
          setPhase("close-error");
        }
      } finally { closing.current = false; }
    }
    void finish();
  }, [phase, settings, onClose]);

  function requestClose() {
    if (phase === "password") { onClose(); return; }
    if (phase === "prices" || phase === "close-error") setPhase("closing");
  }

  return {
    phase, busy, error, authenticate, requestClose,
    retryClose: () => setPhase("closing"),
    returnToPrices: () => setPhase("prices"),
  };
}
