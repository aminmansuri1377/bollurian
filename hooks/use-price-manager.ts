"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/price-manager/catalog";
import { buildQuote } from "@/lib/price-manager/calculations";
import { INITIAL_SETTINGS } from "@/lib/price-manager/constants";
import { selectRailType } from "@/lib/price-manager/rail-rules";
import { createDemoSettings, updateNumericSetting } from "@/lib/price-manager/settings";
import {
  downloadBackup,
  getDatabasePath,
  loadSettings,
  saveQuote,
  saveSettings,
} from "@/lib/price-manager/persistence";
import type { LoadStatus, QuoteSettings, RailType } from "@/lib/price-manager/types";

export function usePriceManager() {
  const [settings, setSettings] = useState<QuoteSettings>(INITIAL_SETTINGS);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("");
  const [databasePath, setDatabasePath] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    let cancelled = false;
    setToday(new Date().toLocaleDateString("fa-IR"));

    async function initialize() {
      try {
        const saved = await loadSettings();
        if (cancelled) return;
        setSettings(saved);
        setStatus("ready");
        try {
          const path = await getDatabasePath();
          if (!cancelled) setDatabasePath(path);
        } catch {
          // A failed path label must not prevent the app from using loaded data.
        }
      } catch (error) {
        console.error("Loading saved settings failed", error);
        if (!cancelled) {
          setStatus("error");
          setMessage("بارگذاری اطلاعات ناموفق بود. برای جلوگیری از بازنویسی داده‌ها، برنامه را ببندید و دوباره باز کنید.");
        }
      }
    }

    void initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    void saveSettings(settings).catch((error: unknown) => {
      console.error("Saving settings failed", error);
      setMessage("ذخیره اطلاعات ناموفق بود. پیش از خروج، یک نسخه پشتیبان دریافت کنید.");
    });
  }, [settings, status]);

  const quote = useMemo(() => buildQuote(PRODUCTS, settings), [settings]);

  const updateSettings = useCallback((patch: Partial<QuoteSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updatePrice = useCallback((key: string, value: number | null) => {
    setSettings((current) => updateNumericSetting(current, "prices", key, value));
  }, []);

  const updatePreviousPrice = useCallback((key: string, value: number | null) => {
    setSettings((current) => updateNumericSetting(current, "previousPrices", key, value));
  }, []);

  function resetDemo() {
    if (status !== "ready") return;
    const confirmed = window.confirm("قیمت‌ها به مقدار نمونهٔ اولیه برگردند و تعدادهای دستی پاک شوند؟ قبل از بازنشانی، فایل پشتیبان دریافت می‌شود.");
    if (!confirmed) return;
    try {
      downloadBackup(settings);
      setSettings(createDemoSettings(settings));
      setMessage("قیمت‌های نمونه بارگذاری شد. نام و تلفن مشتری حفظ شد.");
    } catch (error) {
      console.error("Demo reset backup failed", error);
      setMessage("تهیه پشتیبان ناموفق بود؛ اطلاعات بازنشانی نشد.");
    }
  }

  const updateRailType = useCallback((slot: 0 | 1, type: RailType) => {
    setSettings((current) => ({ ...current, railTypes: selectRailType(current.railTypes, slot, type) }));
  }, []);

  const updateBrand = useCallback((id: string, brand: string) => {
    setSettings((current) => ({ ...current, brands: { ...current.brands, [id]: brand } }));
  }, []);

  const toggleProduct = useCallback((id: string) => {
    setSettings((current) => ({
      ...current,
      excluded: current.excluded.includes(id)
        ? current.excluded.filter((productId) => productId !== id)
        : [...current.excluded, id],
    }));
  }, []);

  /** Shared by the "خروجی PDF" button and the print button of the preview. */
  function checkQuoteIsPrintable(): boolean {
    if (quote.incompleteRows.length) {
      setMessage(`قیمت یا تعداد ${quote.incompleteRows.length} ردیف کامل نیست. پیش از صدور PDF آن‌ها را تکمیل کنید.`);
      return false;
    }
    if (!quote.enabledRows.length) {
      setMessage("حداقل یک محصول برای صدور پیش‌فاکتور انتخاب کنید.");
      return false;
    }
    return true;
  }

  /** "خروجی PDF": opens the in-app preview, which has its own close (×) button. */
  function openPreview() {
    if (status !== "ready" || isPrinting) return;
    if (checkQuoteIsPrintable()) setPreviewOpen(true);
  }

  const closePreview = useCallback(() => setPreviewOpen(false), []);

  async function printQuote() {
    if (status !== "ready" || isPrinting) return;
    if (!checkQuoteIsPrintable()) {
      setPreviewOpen(false);
      return;
    }
    setIsPrinting(true);
    try {
      await saveQuote(settings, quote);
      await document.fonts.ready;
      window.print();
    } catch (error) {
      console.error("Exporting quote failed", error);
      setMessage("ذخیره پیش‌فاکتور ناموفق بود؛ لطفاً دوباره تلاش کنید.");
    } finally {
      setIsPrinting(false);
    }
  }

  return {
    settings, status, quote, message, setMessage,
    databasePath, today, isPrinting, previewOpen,
    updateSettings, updatePrice, updatePreviousPrice, updateBrand, updateRailType, toggleProduct, resetDemo,
    openPreview, closePreview, printQuote,
  };
}
