import { isSingleModel } from "@/lib/price-manager/brand-rules";
import { getRailChoices } from "@/lib/price-manager/rail-rules";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteRow, RailSelection, RailType } from "@/lib/price-manager/types";
import { ProductBrandMenu } from "./product-brand-menu";
import { ProductNameCell } from "./product-name-cell";

interface ProductTableProps {
  rows: QuoteRow[];
  railTypes: RailSelection;
  disabled: boolean;
  onRailTypeChange: (slot: 0 | 1, type: RailType) => void;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
}

const columns = "grid grid-cols-[1.85fr_0.43fr_1fr_1fr] gap-[14px]";
const cell = "flex h-[50px] min-w-0 items-center justify-center rounded-full border bg-white px-2 text-[13px] font-light tabular-nums";

/** Quantity, unit price and total are read-only here; prices are changed only in the master-price dialog. */
export function ProductTable({ rows, railTypes, disabled, onRailTypeChange, onBrandChange, onToggle }: ProductTableProps) {
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
          {rows.map((row, index) => {
            // Only the rows of the two rails have a type menu; brackets and clips just follow the choice.
            const slot = row.product.rail?.kind === "rail" ? (railTypes.indexOf(row.product.rail.type) as 0 | 1) : null;
            return (
            <div key={slot === null ? row.product.id : `rail-${slot}`} role="row" className={`${columns} ${row.enabled ? "" : "[&>div:not(:first-child)]:opacity-45"}`}>
              <div role="cell" className="min-w-0">
                {isSingleModel(row.product)
                  ? <ProductNameCell row={row} rowNumber={index + 1} />
                  : <ProductBrandMenu row={row} rowNumber={index + 1} onBrandChange={onBrandChange} onToggle={onToggle}
                      rail={slot === null ? undefined : { type: railTypes[slot], choices: getRailChoices(railTypes, slot), onChange: (type) => onRailTypeChange(slot, type) }} />}
              </div>
              <div role="cell" className={`${cell} ${row.quantity === null && row.enabled ? "border-amber-500/75" : "border-outline"}`} title={`واحد: ${row.product.unit}`}>
                {row.quantity === null ? "—" : formatNumber(row.quantity)}
              </div>
              <div role="cell" className={`${cell} ${row.unitPrice === null && row.enabled ? "border-amber-500/75" : "border-outline"}`} title="قیمت از مدیریت قیمت مادر">
                {formatMoney(row.unitPrice)}
              </div>
              <div role="cell" className={`${cell} border-outline`} title="مبلغ به تومان">
                {formatMoney(row.total)}
              </div>
            </div>
            );
          })}
          {!rows.length && <p className="py-10 text-center text-sm text-caption">محصولی برای نمایش وجود ندارد.</p>}
        </div>
      </div>
    </fieldset>
  );
}
