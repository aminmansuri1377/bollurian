"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/price-manager/format";
import type { QuoteRow } from "@/lib/price-manager/types";

interface ProductBrandMenuProps {
  row: QuoteRow;
  rowNumber: number;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
}

export function ProductBrandMenu({ row, rowNumber, onBrandChange, onToggle }: ProductBrandMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { product } = row;
  const panelId = `product-options-${product.id}`;

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
        className="flex h-full w-full cursor-pointer items-center rounded-full border border-outline bg-white text-right outline-none transition-shadow hover:border-brand data-[inactive=true]:opacity-45 focus-visible:ring-2 focus-visible:ring-brand/25"
        title={product.name}
      >
        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-linear-to-r from-brand to-brand-end text-[16px] text-white">{formatNumber(rowNumber)}</span>
        <span className="min-w-0 flex-1 truncate px-3 text-[13px] font-light">{product.name}</span>
        <ChevronIcon className={`ml-5 h-[7px] w-[10px] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="absolute top-[58px] right-0 z-30 w-[385px] rounded-[20px] border border-outline bg-white p-5 text-[12px] leading-6 shadow-xl shadow-brand/15" role="group" aria-label="مشخصات و برند محصول">
          <p className="mb-2 text-[13px] font-bold">{product.name}</p>
          <p className="mb-3 text-caption">کد: <bdi>{product.id}</bdi> · واحد: {product.unit}</p>
          <label htmlFor={`brand-${product.id}`} className="mb-1 block font-medium">برند / مدل</label>
          <select
            id={`brand-${product.id}`}
            value={row.brand}
            disabled={!product.brands.length}
            onChange={(event) => onBrandChange(product.id, event.target.value)}
            className="h-10 w-full cursor-pointer rounded-full border border-outline bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-default disabled:text-caption"
          >
            <option value="">{product.brands.length ? "انتخاب برند" : "برند تأییدشده ثبت نشده است"}</option>
            {row.brand && !product.brands.includes(row.brand) && <option value={row.brand}>{row.brand}</option>}
            {product.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
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
