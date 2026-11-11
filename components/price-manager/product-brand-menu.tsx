"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/ui/icons";
import { isBrandSelectable } from "@/lib/price-manager/brand-rules";
import { formatClientBrandLabel, formatClientProductName, getClientBrandOptions, getClientRailLabel } from "@/lib/price-manager/client-rules";
import { formatNumber, formatMoney } from "@/lib/price-manager/format";
import type { QuoteRow, RailType } from "@/lib/price-manager/types";
import { RowNumberBadge } from "./row-number-badge";

interface ProductBrandMenuProps {
  row: QuoteRow;
  rowNumber: number;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
  /** Present only for the two rail rows: the rail type replaces the brand selector. */
  rail?: { type: RailType; choices: RailType[]; onChange: (type: RailType) => void };
}

export function ProductBrandMenu({ row, rowNumber, onBrandChange, onToggle, rail }: ProductBrandMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { product } = row;
  const panelId = `product-options-${product.id}`;
  const displayName = formatClientProductName(product, row.brand);
  const brandOptions = getClientBrandOptions(product, row.brand);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative h-[50px] min-w-0" onKeyDown={(event) => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        data-inactive={!row.enabled}
        aria-controls={panelId}
        aria-label={`برند و جزئیات ${product.name}`}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-full w-full cursor-pointer items-center rounded-full border border-brand bg-white pr-[50px] text-right outline-none transition-shadow hover:shadow-sm data-[inactive=true]:opacity-45 focus-visible:ring-2 focus-visible:ring-brand/25"
        title={displayName}
      >
        <RowNumberBadge value={rowNumber} className="absolute -top-px -right-px" />
        <span className="min-w-0 flex-1 truncate px-3 text-[13px] font-light">{displayName}</span>
        <ChevronIcon className={`ml-5 h-[7px] w-[10px] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="absolute top-[58px] right-0 z-30 w-[385px] rounded-[20px] border border-outline bg-white p-5 text-[12px] leading-6 shadow-xl shadow-brand/15" role="group" aria-label="مشخصات و برند محصول">
          <p className="mb-2 text-[13px] font-bold">{displayName}</p>
          <p className="mb-3 text-caption">کد: <bdi>{product.id}</bdi> · واحد: {product.unit}</p>
          {rail ? (
            <>
              <label htmlFor={`rail-type-${product.id}`} className="mb-1 block font-medium">نوع ریل</label>
              <select
                id={`rail-type-${product.id}`}
                value={rail.type}
                onChange={(event) => rail.onChange(event.target.value as RailType)}
                className="h-10 w-full cursor-pointer rounded-full border border-outline bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
              >
                {rail.choices.map((type) => <option key={type} value={type}>{getClientRailLabel(type)}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-caption">دو ریل نمی‌توانند هم‌نوع باشند. براکت و لقمه هم‌نوع ریل انتخاب‌شده تغییر می‌کنند و قیمت هر قلم از مدیریت قیمت مادر می‌آید.</p>
            </>
          ) : isBrandSelectable(product) ? (
            <>
              <label htmlFor={`brand-${product.id}`} className="mb-1 block font-medium">برند / مدل</label>
              <select
                id={`brand-${product.id}`}
                value={row.brand}
                onChange={(event) => onBrandChange(product.id, event.target.value)}
                className="h-10 w-full cursor-pointer rounded-full border border-outline bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
              >
                {brandOptions.map((brand) => <option key={brand} value={brand}>{formatClientBrandLabel(product, brand)}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-caption">با تغییر برند، قیمت واحد طبق قیمت همان برند در مدیریت قیمت مادر تغییر می‌کند.</p>
            </>
          ) : (
            <p className="font-medium">برند / مدل: <span className="font-light">{row.brand || "ثبت نشده"}</span></p>
          )}

          <div className="mt-3 rounded-xl bg-lavender/25 p-3 text-[11px] leading-6">
            <p>{row.quantitySource === "manual" ? "تعداد دستی" : row.quantitySource === "workbook" ? "تعداد اکسل" : row.quantitySource === "invoice" ? "تعداد پیش‌فاکتور" : row.quantitySource === "catalog" ? "تعداد کاتالوگ" : "تعداد نامشخص"}: <bdi>{row.quantityReference}</bdi></p>
            <p>فرمول مبنا: تعداد × قیمت مادر</p>
            <p dir="ltr" className="text-center tabular-nums">{row.quantity === null ? "—" : formatNumber(row.quantity)} × {formatMoney(row.unitPrice)} = {formatMoney(row.baseTotal)}</p>
          </div>
          {product.notes && <p className="mt-3 text-caption">{product.notes}</p>}
          <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-outline/25 pt-3">
            <input type="checkbox" checked={row.enabled} onChange={() => onToggle(product.id)} className="size-4 accent-brand" />
            این محصول در پیش‌فاکتور محاسبه شود
          </label>
        </div>
      )}
    </div>
  );
}
