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
  boldText?: boolean;
  onRailTypeChange: (slot: 0 | 1, type: RailType) => void;
  onBrandChange: (id: string, brand: string) => void;
  onToggle: (id: string) => void;
}

const columns = "grid grid-cols-[1.95fr_1.25fr_0.92fr] gap-[10px]";
const sectionBar = "flex h-[32px] items-center rounded-full bg-lavender px-5 text-[12px] font-medium";
const priceCell = "flex h-[34px] min-w-0 items-center justify-center rounded-full border bg-white px-2 text-[11px] tabular-nums";

/** Quantity is rendered as the dark badge attached to the right side of unit price, matching the supplied design. */
export function ProductTable({
  rows,
  settings,
  railTypes,
  disabled,
  boldText = false,
  onRailTypeChange,
  onBrandChange,
  onToggle,
}: ProductTableProps) {
  const sections = groupRowsByCategory(rows);
  const valueWeight = boldText ? "font-bold" : "font-light";

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <div
        role="table"
        aria-label="جدول تجهیزات و قیمت‌ها"
        aria-colcount={3}
        aria-rowcount={rows.length + 1 + sections.length + sections.filter((section) => section.hasSubtotal).length}
      >
        <div role="rowgroup">
          <div role="row" className={`${columns} mb-[8px]`}>
            <div role="columnheader" className="flex h-[30px] items-center justify-center rounded-full bg-lavender px-2 text-center text-[10px] font-light">
              شرح کالا / انتخاب برند
            </div>
            <div role="columnheader" className="relative flex h-[30px] items-center justify-center rounded-full bg-lavender pr-[52px] pl-2 text-center text-[10px] font-light">
              <span className="absolute inset-y-0 right-0 flex w-[48px] items-center justify-center rounded-full bg-brand text-[9px] font-medium text-white">
                تعداد
              </span>
              قیمت به ازای هر واحد
            </div>
            <div role="columnheader" className="flex h-[30px] items-center justify-center rounded-full bg-lavender px-2 text-center text-[10px] font-light">
              قیمت کل
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.category} role="rowgroup" aria-label={section.label} className="mb-[16px] flex flex-col gap-[6px] last:mb-0">
            <div role="row">
              <div role="columnheader" aria-colspan={3} className={sectionBar}>
                {section.label}
              </div>
            </div>

            {section.rows.map((row, sectionIndex) => {
              const index = section.firstRowNumber - 1 + sectionIndex;
              const slot = row.product.rail?.kind === "rail" ? (railTypes.indexOf(row.product.rail.type) as 0 | 1) : null;
              const quantityMissing = row.quantity === null && row.enabled;

              return (
                <div key={slot === null ? row.product.id : `rail-${slot}`} role="row" className={`${columns} ${row.enabled ? "" : "[&>div:not(:first-child)]:opacity-45"}`}>
                  <div role="cell" className="min-w-0">
                    {isSingleModel(row.product) ? (
                      <ProductNameCell row={row} rowNumber={index + 1} boldText={boldText} />
                    ) : (
                      <ProductBrandMenu
                        row={row}
                        rowNumber={index + 1}
                        settings={settings}
                        boldText={boldText}
                        onBrandChange={onBrandChange}
                        onToggle={onToggle}
                        rail={slot === null ? undefined : {
                          type: railTypes[slot],
                          choices: getClientRailChoices(slot),
                          onChange: (type) => onRailTypeChange(slot, type),
                        }}
                      />
                    )}
                  </div>

                  <div
                    role="cell"
                    className={`relative flex h-[34px] min-w-0 items-center rounded-full border bg-white pr-[52px] pl-2 text-[11px] tabular-nums ${valueWeight} ${row.unitPrice === null && row.enabled ? "border-amber-500/75" : "border-outline"}`}
                    title={`تعداد: ${row.quantity === null ? "نامشخص" : formatNumber(row.quantity)} ${row.product.unit} • قیمت از مدیریت قیمت مادر`}
                  >
                    <span
                      className={`absolute -top-px -right-px flex h-[34px] w-[50px] items-center justify-center rounded-full border text-[11px] ${boldText ? "font-bold" : "font-medium"} text-white ${quantityMissing ? "border-amber-500 bg-amber-500" : "border-brand bg-brand"}`}
                      aria-label={`تعداد ${row.quantity === null ? "نامشخص" : formatNumber(row.quantity)}`}
                    >
                      {row.quantity === null ? "—" : formatNumber(row.quantity)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-center">{formatMoney(row.unitPrice)}</span>
                  </div>

                  <div role="cell" className={`${priceCell} border-outline ${valueWeight}`} title="مبلغ به تومان">
                    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                      <bdi>{formatMoney(row.total)}</bdi>
                      <span className="text-[9px] text-brand/70">تومان</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {section.hasSubtotal && (
              <div role="row" className={columns}>
                <div role="cell" aria-colspan={2} className="col-span-2 flex h-[30px] items-center justify-end px-5 text-[11px] font-medium">
                  جمع {section.label}
                </div>
                <div role="cell" className={`${priceCell} h-[30px] border-brand font-medium`} title="جمع گروه به تومان">
                  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                    <bdi>{formatMoney(section.subtotal)}</bdi>
                    <span className="text-[9px] text-brand/70">تومان</span>
                  </span>
                </div>
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
