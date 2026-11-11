import { isSingleModel } from "@/lib/price-manager/brand-rules";
import { groupRowsByCategory } from "@/lib/price-manager/calculations";
import { getClientRailChoices } from "@/lib/price-manager/client-rules";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteRow, QuoteSettings, RailSelection, RailType } from "@/lib/price-manager/types";
import { ProductBrandMenu } from "./product-brand-menu";
import { ProductNameCell } from "./product-name-cell";

interface ProductTableProps {
  rows: QuoteRow[];
  settings: QuoteSettings;
  railTypes: RailSelection;
  disabled: boolean;
  onRailTypeChange: (slot: 0 | 1, type: RailType) => void;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
}

const columns = "grid grid-cols-[1.85fr_0.43fr_1fr_1fr] gap-[14px]";
const sectionBar = "flex h-[44px] items-center rounded-full bg-lavender px-6 text-[14px] font-medium";
const cell = "flex h-[50px] min-w-0 items-center justify-center rounded-full border bg-white px-2 text-[13px] font-light tabular-nums";

/** Quantity, unit price and total are read-only here; prices are changed only in the master-price dialog. */
export function ProductTable({ rows, settings, railTypes, disabled, onRailTypeChange, onBrandChange, onToggle }: ProductTableProps) {
  const sections = groupRowsByCategory(rows);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <div role="table" aria-label="جدول تجهیزات و قیمت‌ها" aria-colcount={4} aria-rowcount={rows.length + 1 + sections.length + sections.filter((s) => s.hasSubtotal).length}>
        <div role="rowgroup">
          <div role="row" className={`${columns} mb-[14px]`}>
            {["شرح کالا / انتخاب برند", "تعداد", "قیمت به ازای هر واحد", "قیمت کل"].map((label) => (
              <div key={label} role="columnheader" className="flex h-[50px] items-center justify-center rounded-full bg-lavender px-2 text-center text-[13px] font-light">
                {label}
              </div>
            ))}
          </div>
        </div>
        {sections.map((section) => (
        <div key={section.category} role="rowgroup" aria-label={section.label} className="mb-[28px] flex flex-col gap-[14px] last:mb-0">
          <div role="row"><div role="columnheader" aria-colspan={4} className={sectionBar}>{section.label}</div></div>
          {section.rows.map((row, sectionIndex) => {
            const index = section.firstRowNumber - 1 + sectionIndex;
            // Only the rows of the two rails have a type menu; brackets and clips just follow the choice.
            const slot = row.product.rail?.kind === "rail" ? (railTypes.indexOf(row.product.rail.type) as 0 | 1) : null;
            return (
            <div key={slot === null ? row.product.id : `rail-${slot}`} role="row" className={`${columns} ${row.enabled ? "" : "[&>div:not(:first-child)]:opacity-45"}`}>
              <div role="cell" className="min-w-0">
                {isSingleModel(row.product)
                  ? <ProductNameCell row={row} rowNumber={index + 1} />
                  : <ProductBrandMenu row={row} rowNumber={index + 1} settings={settings} onBrandChange={onBrandChange} onToggle={onToggle}
                      rail={slot === null ? undefined : { type: railTypes[slot], choices: getClientRailChoices(slot), onChange: (type) => onRailTypeChange(slot, type) }} />}
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
          {section.hasSubtotal && (
            <div role="row" className={columns}>
              <div role="cell" aria-colspan={3} className="col-span-3 flex h-[44px] items-center justify-end px-6 text-[13px] font-medium">جمع {section.label}</div>
              <div role="cell" className={`${cell} h-[44px] border-brand font-medium`} title="جمع گروه به تومان">{formatMoney(section.subtotal)}</div>
            </div>
          )}
        </div>
        ))}
        <div role="rowgroup">
          {!rows.length && <p className="py-10 text-center text-sm text-caption">محصولی برای نمایش وجود ندارد.</p>}
        </div>
      </div>
    </fieldset>
  );
}
