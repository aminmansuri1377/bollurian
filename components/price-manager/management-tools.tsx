"use client";

import { useState } from "react";
import { SettingsIcon } from "@/components/ui/icons";
import type { QuoteSettings } from "@/lib/price-manager/types";
import { MasterPricesDialog } from "./master-prices-dialog";

interface ManagementToolsProps {
  settings: QuoteSettings;
  disabled: boolean;
  databasePath: string;
  onSettingsChange: (patch: Partial<QuoteSettings>) => void;
  onPriceChange: (key: string, value: number | null) => void;
  onPreviousPriceChange: (key: string, value: number | null) => void;
  onResetDemo: () => void;
}

const textInput = "mt-2 h-11 w-full rounded-full border border-outline bg-white px-4 text-sm text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/25";
const actionButton = "cursor-pointer rounded-full border border-outline bg-white px-6 py-2.5 text-[13px] outline-none hover:bg-lavender/30 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-wait";

/** Shown at the very top of the page so the customer's name and phone are entered first. */
export function ManagementTools({ settings, disabled, databasePath, onSettingsChange, onPriceChange, onPreviousPriceChange, onResetDemo }: ManagementToolsProps) {
  const [pricesOpen, setPricesOpen] = useState(false);

  return (
    <>
      <section aria-label="تنظیمات پیش‌فاکتور، قیمت مادر" className="mb-6 rounded-[22px] border border-outline/40 bg-white px-7 py-5">
        <h2 className="flex items-center gap-2 text-[14px] font-medium"><SettingsIcon className="size-5" />تنظیمات پیش‌فاکتور، قیمت مادر</h2>
        <fieldset disabled={disabled} className="min-w-0 pt-5">
          <div className="grid grid-cols-3 gap-5">
            <label className="text-[12px] text-caption">نام مشتری
              <input aria-label="نام مشتری" value={settings.customer} onChange={(event) => onSettingsChange({ customer: event.target.value })} className={textInput} placeholder="نام و نام خانوادگی یا پروژه" autoComplete="off" />
            </label>
            <label className="text-[12px] text-caption">شماره تماس مشتری
              <input aria-label="شماره تماس مشتری" type="tel" inputMode="tel" dir="ltr" value={settings.customerPhone} onChange={(event) => onSettingsChange({ customerPhone: event.target.value })} className={`${textInput} text-right`} placeholder="۰۹۱۲۳۴۵۶۷۸۹" autoComplete="off" />
            </label>
            <label className="text-[12px] text-caption">شماره پیش‌فاکتور
              <input aria-label="شماره پیش‌فاکتور" value={settings.quoteNumber} onChange={(event) => onSettingsChange({ quoteNumber: event.target.value })} className={textInput} placeholder="اختیاری" autoComplete="off" />
            </label>
          </div>
          <p className="mt-4 text-[12px] leading-6 text-caption">قیمت‌ها فقط از «مدیریت قیمت مادر» تغییر می‌کنند. در لیست اصلی، تعداد و قیمت‌ها فقط نمایش داده می‌شوند. برای حذف یک قلم از محاسبات، گزینه آن را در منوی کنار نام محصول بردارید.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPricesOpen(true)} className={actionButton}>مدیریت قیمت مادر</button>
            <button type="button" onClick={onResetDemo} className={actionButton}>بازنشانی نمونه ۱۰۰۰ تومانی (با پشتیبان)</button>
          </div>
          <p className="mt-4 text-[11px] leading-6 text-caption">
            {databasePath ? <>مسیر دیتابیس: <bdi className="select-all">{databasePath}</bdi></> : "نسخه مرورگر: ذخیره در همین مرورگر • نسخه دسکتاپ: ذخیره در SQLite"}
          </p>
        </fieldset>
      </section>
      <MasterPricesDialog open={pricesOpen} settings={settings} onClose={() => setPricesOpen(false)} onPriceChange={onPriceChange} onPreviousPriceChange={onPreviousPriceChange} />
    </>
  );
}
