"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/ui/icons";
import type { QuoteSettings, QuoteSummary } from "@/lib/price-manager/types";
import { QuotePrintDocument } from "./quote-print-document";

interface QuotePreviewProps {
  settings: QuoteSettings;
  quote: QuoteSummary;
  today: string;
  isPrinting: boolean;
  onPrint: () => void;
  onClose: () => void;
}

/**
 * Full-screen preview of the quote before printing / saving as PDF.
 * The system print dialog is not part of the page, so the visible way back is the × button here
 * (Esc works too). It is never printed (`print:hidden`); the print-only copy of the quote is rendered elsewhere.
 */
export function QuotePreview({ settings, quote, today, isPrinting, onPrint, onClose }: QuotePreviewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="پیش‌نمایش پیش‌فاکتور"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-[#e6ebf2] outline-none print:hidden"
    >
      <header className="flex h-[64px] shrink-0 items-center justify-between gap-4 border-b border-outline/40 bg-white px-6">
        <div className="flex items-center gap-5">
          <h2 className="text-[16px] font-medium">پیش‌نمایش پیش‌فاکتور</h2>
          <button
            type="button"
            onClick={onPrint}
            disabled={isPrinting}
            className="h-[40px] cursor-pointer rounded-full bg-linear-to-r from-brand to-brand-end px-6 text-[13px] text-white outline-none transition-shadow hover:shadow-lg hover:shadow-brand/15 focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPrinting ? "آماده‌سازی…" : "چاپ / ذخیره PDF"}
          </button>
        </div>
        <button
          type="button"
          aria-label="بستن پیش‌نمایش"
          title="بستن (Esc)"
          onClick={onClose}
          className="grid size-10 cursor-pointer place-items-center rounded-full text-brand outline-none transition-colors hover:bg-lavender/60 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <CloseIcon className="size-6" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* A4 width minus the 12mm print margins on each side, like the printed page. */}
        <div className="mx-auto w-[794px] bg-white p-[45px] shadow-lg shadow-brand/15">
          <QuotePrintDocument settings={settings} quote={quote} today={today} preview />
        </div>
      </div>
    </div>
  );
}
