"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { isNativeAdminRuntime } from "@/lib/admin/access";

interface AdminPasswordDialogProps {
  busy: boolean;
  error: string;
  onSubmit: (password: string) => Promise<void>;
  onClose: () => void;
}

export function AdminPasswordDialog({ busy, error, onSubmit, onClose }: AdminPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (busy) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [busy, error]);

  return (
    <Dialog open title="ورود مدیر" size="compact" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (busy || !password) return;
        const submitted = password;
        setPassword("");
        void onSubmit(submitted);
      }} aria-busy={busy}>
        <p className="mb-5 text-sm leading-7 text-caption">برای مشاهده و ویرایش قیمت مادر، رمز مدیریت را وارد کنید.</p>
        <label htmlFor="master-price-password" className="mb-2 block text-sm font-medium">رمز مدیریت</label>
        <input
          ref={inputRef}
          id="master-price-password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          maxLength={128}
          required
          disabled={busy}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "master-price-password-error" : undefined}
          className="h-12 w-full rounded-full border border-outline px-5 text-center text-base outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60"
        />
        {error && <p id="master-price-password-error" role="alert" className="mt-3 text-sm leading-7 text-red-700">{error}</p>}
        {process.env.NODE_ENV === "development" && !isNativeAdminRuntime() && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">پیش‌نمایش مرورگر: این قفل فقط برای تست رابط است. کنترل دسترسی اصلی در نسخه Tauri اجرا می‌شود.</p>
        )}
        <button type="submit" disabled={busy || !password} className="mt-6 h-11 w-full cursor-pointer rounded-full bg-linear-to-r from-brand to-brand-end text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "در حال بررسی…" : "ورود به مدیریت"}
        </button>
      </form>
    </Dialog>
  );
}
