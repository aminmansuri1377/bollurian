import type { QuoteRow } from "@/lib/price-manager/types";
import { RowNumberBadge } from "./row-number-badge";

interface ProductNameCellProps {
  row: QuoteRow;
  rowNumber: number;
}

/** Single-model products: same look as the brand menu, but nothing happens on click. */
export function ProductNameCell({ row, rowNumber }: ProductNameCellProps) {
  const { product, enabled } = row;
  return (
    <div
      data-inactive={!enabled}
      title={product.name}
      className="relative flex h-[50px] w-full min-w-0 items-center rounded-full border border-brand bg-white pr-[50px] text-right data-[inactive=true]:opacity-45"
    >
      <RowNumberBadge value={rowNumber} className="absolute -top-px -right-px" />
      <span className="min-w-0 flex-1 truncate px-3 text-[13px] font-light">{product.name}</span>
    </div>
  );
}
