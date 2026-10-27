import { NumberInput } from "@/components/ui/number-input";
import { formatMoney } from "@/lib/price-manager/format";
import type { QuoteRow } from "@/lib/price-manager/types";
import { ProductBrandMenu } from "./product-brand-menu";

interface ProductTableProps {
  rows: QuoteRow[];
  disabled: boolean;
  onPriceChange: (id: string, value: number | null) => void;
  onQuantityChange: (id: string, value: number | null) => void;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
}

const columns = "grid grid-cols-[1.85fr_0.43fr_1fr_1fr] gap-[14px]";

export function ProductTable({ rows, disabled, onPriceChange, onQuantityChange, onBrandChange, onToggle }: ProductTableProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <div role="table" aria-label="جدول تجهیزات و قیمت‌ها" aria-colcount={4} aria-rowcount={rows.length + 1}>
        <div role="rowgroup">
          <div role="row" className={`${columns} mb-[14px]`}>
            {["شرح کالا / انتخاب برند", "تعداد", "قیمت به ازای هر واحد", "قیمت کل"].map((label) => (
              <div key={label} role="columnheader" className="flex h-[50px] items-center justify-center rounded-full bg-lavender px-2 text-center text-[13px] font-light">
                {label}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup" className="flex flex-col gap-[14px]">
          {rows.map((row, index) => (
            <div key={row.product.id} role="row" className={`${columns} ${row.enabled ? "" : "[&>div:not(:first-child)]:opacity-45"}`}>
              <div role="cell" className="min-w-0">
                <ProductBrandMenu row={row} rowNumber={index + 1} onBrandChange={onBrandChange} onToggle={onToggle} />
              </div>
              <div role="cell" className={`flex h-[50px] min-w-0 items-center rounded-full border bg-white ${row.quantity === null && row.enabled ? "border-amber-500/75" : "border-outline"}`} title={`واحد: ${row.product.unit}`}>
                <NumberInput value={row.quantity} label={`تعداد ${row.product.name}`} onChange={(value) => onQuantityChange(row.product.id, value)} placeholder="—" className="h-full w-full px-1 text-[13px]" />
              </div>
              <div role="cell" className={`flex h-[50px] min-w-0 items-center rounded-full border bg-white ${row.unitPrice === null && row.enabled ? "border-amber-500/75" : "border-outline"}`}>
                <NumberInput value={row.unitPrice} label={`قیمت ${row.product.name} (تومان)`} onChange={(value) => onPriceChange(row.product.id, value)} className="h-full w-full px-2 text-[13px]" />
              </div>
              <div role="cell" className="flex h-[50px] min-w-0 items-center justify-center rounded-full border border-outline bg-white px-2 text-[13px] font-light tabular-nums" title="مبلغ به تومان">
                {formatMoney(row.total)}
              </div>
            </div>
          ))}
          {!rows.length && <p className="py-10 text-center text-sm text-caption">محصولی برای این جستجو پیدا نشد.</p>}
        </div>
      </div>
    </fieldset>
  );
}