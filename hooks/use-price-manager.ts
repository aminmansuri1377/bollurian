"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/price-manager/catalog";
import { buildQuote, searchQuoteRows } from "@/lib/price-manager/calculations";
import { INITIAL_SETTINGS } from "@/lib/price-manager/constants";
import { createDemoSettings, updateNumericSetting } from "@/lib/price-manager/settings";
import {
  downloadBackup,
  getDatabasePath,
  loadSettings,
  readBackup,
  saveQuote,
  saveSettings,
} from "@/lib/price-manager/persistence";
import type { LoadStatus, QuoteSettings } from "@/lib/price-manager/types";

export function usePriceManager() {
  const [settings, setSettings] = useState<QuoteSettings>(INITIAL_SETTINGS);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [databasePath, setDatabasePath] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
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
  const visibleRows = useMemo(() => searchQuoteRows(quote.rows, query), [quote.rows, query]);

  const updateSettings = useCallback((patch: Partial<QuoteSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updatePrice = useCallback((id: string, value: number | null) => {
    setSettings((current) => updateNumericSetting(current, "prices", id, value));
  }, []);

  const updatePreviousPrice = useCallback((id: string, value: number | null) => {
    setSettings((current) => updateNumericSetting(current, "previousPrices", id, value));
  }, []);

  const updateQuantity = useCallback((id: string, value: number | null) => {
    setSettings((current) => updateNumericSetting(current, "quantities", id, value));
  }, []);

  function resetDemo() {
    if (status !== "ready") return;
    const confirmed = window.confirm("قیمت‌ها به ۱۰۰۰ تومان برگردند و تعدادهای دستی و درصد تغییر پاک شوند؟ قبل از بازنشانی، فایل پشتیبان دریافت می‌شود.");
    if (!confirmed) return;
    try {
      downloadBackup(settings);
      setSettings(createDemoSettings(settings));
      setMessage("نمونه ۱۰۰۰ تومانی بارگذاری شد. تعدادها از اکسل خوانده می‌شوند؛ مقادیر نامشخص همچنان خالی هستند.");
    } catch (error) {
      console.error("Demo reset backup failed", error);
      setMessage("تهیه پشتیبان ناموفق بود؛ اطلاعات بازنشانی نشد.");
    }
  }

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

  async function restoreBackup(file: File | undefined) {
    if (!file) return;
    try {
      setSettings(await readBackup(file));
      setMessage("نسخه پشتیبان با موفقیت بازیابی شد.");
    } catch {
      setMessage("فایل انتخاب‌شده یک نسخه پشتیبان معتبر بلوریان نیست.");
    }
  }

  async function printQuote() {
    if (status !== "ready" || isPrinting) return;
    if (quote.incompleteRows.length) {
      setMessage(`قیمت یا تعداد ${quote.incompleteRows.length} ردیف کامل نیست. پیش از صدور PDF آن‌ها را تکمیل کنید.`);
      return;
    }
    if (!quote.enabledRows.length) {
      setMessage("حداقل یک محصول برای صدور پیش‌فاکتور انتخاب کنید.");
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
    settings, status, quote, visibleRows, query, setQuery, message, setMessage,
    databasePath, today, isPrinting,
    updateSettings, updatePrice, updatePreviousPrice, updateQuantity, updateBrand, toggleProduct, resetDemo,
    restoreBackup, printQuote,
    exportBackup: () => downloadBackup(settings),
  };
}
