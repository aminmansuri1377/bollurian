import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteRow } from "@/lib/price-manager/types";
import { RowNumberBadge } from "./row-number-badge";

interface QuotePrintRowProps {
  row: QuoteRow;
  rowNumber: number;
}

const numberCellClasses =
  "rounded-[14px] border border-outline px-1 py-1 align-middle text-center leading-[14px] tabular-nums";

/** Compact print rows; only genuinely long product names may add a line. */
export function QuotePrintRow({ row, rowNumber }: QuotePrintRowProps) {
  const { product, brand, quantity, unitPrice, total } = row;
  const brandSuffix = brand && !product.name.includes(brand) ? ` \u2014 ${brand}` : "";

  return (
    <tr data-quote-row={product.id} className="break-inside-avoid [page-break-inside:avoid]">
      <td className="rounded-[14px] border border-brand p-0 align-middle">
        <div className="relative flex min-h-[26px] items-center py-[3px] pr-[34px] pl-2">
          <RowNumberBadge value={rowNumber} size="print" className="absolute -top-px -right-px" />
          <span className="min-w-0 break-words leading-[14px]">
            {product.name}{brandSuffix}
          </span>
        </div>
      </td>
      <td className={numberCellClasses}>
        {/* Keep the unit, but never make it a second line below the quantity. */}
        <span className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-[14px]">
          <bdi>{quantity === null ? "\u2014" : formatNumber(quantity)}</bdi>
          {product.unit && <span className="text-[8px] text-brand/65">{product.unit}</span>}
        </span>
      </td>
      <td className={`${numberCellClasses} whitespace-nowrap`}>{formatMoney(unitPrice)}</td>
      <td className={`${numberCellClasses} whitespace-nowrap`}>{formatMoney(total)}</td>
    </tr>
  );
}
