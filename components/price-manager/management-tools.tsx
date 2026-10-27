"use client";

import { useState } from "react";
import { SettingsIcon } from "@/components/ui/icons";
import { NumberInput } from "@/components/ui/number-input";
import type { QuoteSettings } from "@/lib/price-manager/types";
import { MasterPricesDialog } from "./master-prices-dialog";

interface ManagementToolsProps {
  settings: QuoteSettings;
  disabled: boolean;
  query: string;
  databasePath: string;
  onQueryChange: (query: string) => void;
  onSettingsChange: (patch: Partial<QuoteSettings>) => void;
  onPriceChange: (id: string, value: number | null) => void;
  onPreviousPriceChange: (id: string, value: number | null) => void;
  onResetDemo: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
}

const textInput = "mt-2 h-11 w-full rounded-full border border-outline bg-white px-4 text-sm text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/25";
const actionButton = "cursor-pointer rounded-full border border-outline bg-white px-6 py-2.5 text-[13px] outline-none hover:bg-lavender/30 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-wait";

export function ManagementTools({ settings, disabled, query, databasePath, onQueryChange, onSettingsChange, onPriceChange, onPreviousPriceChange, onResetDemo, onExportBackup, onImportBackup }: ManagementToolsProps) {
  const [pricesOpen, setPricesOpen] = useState(false);

  return (
    <>
      <details className="mt-6 rounded-[22px] border border-outline/40 bg-white px-7 py-5">
        <summary className="cursor-pointer text-[14px] font-medium marker:text-outline">
          <span className="inline-flex items-center gap-2 align-middle"><SettingsIcon className="size-5" />تنظیمات پیش‌فاکتور، قیمت مادر و پشتیبان‌گیری</span>
        </summary>
        <fieldset disabled={disabled} className="min-w-0 pt-6">
          <div className="grid grid-cols-4 gap-5">
            <label className="text-[12px] text-caption">نام مشتری / پروژه
              <input aria-label="نام مشتری / پروژه" value={settings.customer} onChange={(event) => onSettingsChange({ customer: event.target.value })} className={textInput} placeholder="اختیاری" />
            </label>
            <label className="text-[12px] text-caption">شماره پیش‌فاکتور
              <input aria-label="شماره پیش‌فاکتور" value={settings.quoteNumber} onChange={(event) => onSettingsChange({ quoteNumber: event.target.value })} className={textInput} placeholder="اختیاری" />
            </label>
            <label className="text-[12px] text-caption">تعدیل اختیاری پیش‌فاکتور (درصد)
              <NumberInput value={settings.rate} label="تعدیل اختیاری پیش‌فاکتور (درصد)" allowNegative onChange={(value) => onSettingsChange({ rate: Math.max(-100, value ?? 0) })} className={textInput} />
            </label>
            <label className="text-[12px] text-caption">جستجوی محصول
              <input aria-label="جستجوی محصول" value={query} onChange={(event) => onQueryChange(event.target.value)} className={textInput} placeholder="نام، برند یا کد" />
            </label>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-caption">جستجو فقط ردیف‌های قابل مشاهده را فیلتر می‌کند؛ جمع و PDF همیشه مربوط به تمام اقلام انتخاب‌شده پکیج هستند. برای حذف یک قلم از محاسبات، گزینه آن را در منوی کنار نام محصول بردارید.</p>
          <p className="mt-3 text-[12px] leading-6 text-caption">فرمول اکسل: تعداد از جدول توقف × قیمت مادر. تعدیل درصدی قابلیت جداگانه برنامه است و در اکسل نیست؛ برای مقایسه آن را صفر بگذارید.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onResetDemo} className={actionButton}>بازنشانی نمونه ۱۰۰۰ تومانی (با پشتیبان)</button>
            <button type="button" onClick={() => setPricesOpen(true)} className={actionButton}>مدیریت قیمت مادر</button>
            <button type="button" onClick={onExportBackup} className={actionButton}>دریافت پشتیبان</button>
            <label className={`${actionButton} relative focus-within:ring-2 focus-within:ring-brand/25`}>
              بازیابی پشتیبان
              <input type="file" accept=".json,application/json" aria-label="بازیابی پشتیبان" className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                onImportBackup(file);
              }} />
            </label>
          </div>
          <p className="mt-5 text-[11px] leading-6 text-caption">
            {databasePath ? <>مسیر دیتابیس: <bdi className="select-all">{databasePath}</bdi></> : "نسخه مرورگر: ذخیره در همین مرورگر • نسخه دسکتاپ: ذخیره در SQLite"}
          </p>
        </fieldset>
      </details>
      <MasterPricesDialog open={pricesOpen} settings={settings} onClose={() => setPricesOpen(false)} onPriceChange={onPriceChange} onPreviousPriceChange={onPreviousPriceChange} />
    </>
  );
}
