"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import {
  getPriceKey,
  isBrandSelectable,
  resolveBrand,
} from "@/lib/price-manager/brand-rules";
import { CLIENT_PRODUCTS } from "@/lib/price-manager/client-products";
import { formatClientProductName } from "@/lib/price-manager/client-rules";
import {
  GROUP_LABELS,
  OMITTED_PRODUCT_ID,
} from "@/lib/price-manager/constants";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import {
  comparePrices,
  getBaseBrandPrice,
  getMasterPrice,
  getPreviousPrice,
} from "@/lib/price-manager/master-price";
import {
  downloadMasterPrices,
  readMasterPriceFile,
} from "@/lib/price-manager/price-transfer";
import type { QuoteSettings } from "@/lib/price-manager/types";

interface MasterPricesDialogProps {
  open: boolean;
  settings: QuoteSettings;
  onClose: () => void;
  onPriceChange: (key: string, value: number | null) => void;
  onPreviousPriceChange: (key: string, value: number | null) => void;
}

const priceInputClass =
  "h-10 w-[115px] rounded-full border border-outline px-2";
const transferButton =
  "h-9 cursor-pointer rounded-full border border-outline bg-white px-4 text-[12px] font-medium text-brand outline-none transition-colors hover:bg-lavender/35 focus-visible:ring-2 focus-visible:ring-brand/25";

export function MasterPricesDialog({
  open,
  settings,
  onClose,
  onPriceChange,
  onPreviousPriceChange,
}: MasterPricesDialogProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState(false);
  const [importing, setImporting] = useState(false);

  // One row per brand for products whose brand can be chosen; every other product has a single row.
  const entries = CLIENT_PRODUCTS.filter(
    (product) => product.id !== OMITTED_PRODUCT_ID,
  ).flatMap((product) =>
    isBrandSelectable(product)
      ? product.brands.map((brand) => ({ product, brand }))
      : [{ product, brand: resolveBrand(product, undefined) }],
  );

  function exportPrices() {
    try {
      const count = downloadMasterPrices(settings);
      setTransferError(false);
      setTransferMessage(`فایل شامل ${formatNumber(count)} قیمت ساخته شد.`);
    } catch (error) {
      console.error("Exporting master prices failed", error);
      setTransferError(true);
      setTransferMessage(error instanceof Error ? error.message : "گرفتن خروجی قیمت‌ها ناموفق بود.");
    }
  }

  async function importPrices(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setTransferMessage("");
    try {
      const imported = await readMasterPriceFile(file);
      const count = Object.keys(imported.prices).length;
      const confirmed = window.confirm(
        `این فایل شامل ${formatNumber(count)} قیمت است. همه قیمت‌های مادر فعلی با قیمت‌های این فایل جایگزین شوند؟`,
      );
      if (!confirmed) return;

      const importedPriceKeys = new Set(Object.keys(imported.prices));
      for (const key of Object.keys(settings.prices)) {
        if (!importedPriceKeys.has(key)) onPriceChange(key, null);
      }
      for (const [key, value] of Object.entries(imported.prices)) {
        onPriceChange(key, value);
      }

      for (const key of Object.keys(settings.previousPrices)) {
        onPreviousPriceChange(key, null);
      }
      for (const [key, value] of Object.entries(imported.previousPrices)) {
        onPreviousPriceChange(key, value);
      }

      setTransferError(false);
      setTransferMessage(`قیمت‌های ${formatNumber(count)} قلم از فایل وارد شدند.`);
    } catch (error) {
      console.error("Importing master prices failed", error);
      setTransferError(true);
      setTransferMessage(error instanceof Error ? error.message : "ورود فایل قیمت ناموفق بود.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} title="مدیریت قیمت مادر" onClose={onClose}>
      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-outline/35 bg-lavender/15 px-4 py-3">
        <p className="text-[11px] leading-5 text-caption">
          بعد از به‌روزرسانی قیمت‌ها خروجی بگیرید و همان فایل را روی سیستم ادمین دیگر وارد کنید.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={exportPrices} className={transferButton}>
            گرفتن خروجی
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className={`${transferButton} disabled:cursor-wait disabled:opacity-55`}
          >
            {importing ? "در حال ورود…" : "ورود فایل"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importPrices}
            className="hidden"
            tabIndex={-1}
          />
        </div>
      </div>
      {transferMessage && (
        <p
          role={transferError ? "alert" : "status"}
          className={`mb-4 rounded-xl px-4 py-2 text-[11px] ${transferError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
        >
          {transferMessage}
        </p>
      )}

      <table className="w-full border-separate border-spacing-y-2 text-right text-[12px]">
        <thead>
          <tr>
            {[
              "محصول",
              "دسته",
              "مبنا",
              "قیمت جدید",
              "قیمت قبلی",
              "تغییر",
            ].map((label) => (
              <th
                key={label}
                className="bg-lavender px-2 py-3 font-medium first:rounded-r-full last:rounded-l-full"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(({ product, brand }) => {
            const priceKey = getPriceKey(product, brand);
            const current = getMasterPrice(product, settings, brand);
            const previous = getPreviousPrice(product, settings, brand);
            const change = comparePrices(current, previous);
            const title = brand ? formatClientProductName(product, brand) : product.name;
            return (
              <tr key={priceKey}>
                <td className="max-w-[250px] px-2 py-2">{title}</td>
                <td className="px-2 py-2">{GROUP_LABELS[product.group]}</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                  {formatMoney(getBaseBrandPrice(product, brand))}
                </td>
                <td className="px-2 py-2">
                  <NumberInput
                    value={current}
                    label={`قیمت مادر ${title}`}
                    onChange={(value) => onPriceChange(priceKey, value)}
                    className={priceInputClass}
                  />
                </td>
                <td className="px-2 py-2">
                  <NumberInput
                    value={previous}
                    placeholder="اختیاری"
                    label={`قیمت قبلی ${title}`}
                    onChange={(value) => onPreviousPriceChange(priceKey, value)}
                    className={priceInputClass}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-center">
                  <bdi>
                    {change.ratio === null
                      ? "—"
                      : `${formatNumber(change.ratio * 100)}٪`}
                  </bdi>
                  <small className="block text-caption">{change.status}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Dialog>
  );
}
