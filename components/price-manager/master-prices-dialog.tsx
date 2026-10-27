import { Dialog } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import { PRODUCTS } from "@/lib/price-manager/catalog";
import { GROUP_LABELS, OMITTED_PRODUCT_ID } from "@/lib/price-manager/constants";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import { comparePrices, getMasterPrice, getPreviousPrice } from "@/lib/price-manager/master-price";
import type { QuoteSettings } from "@/lib/price-manager/types";

interface MasterPricesDialogProps {
  open: boolean;
  settings: QuoteSettings;
  onClose: () => void;
  onPriceChange: (id: string, value: number | null) => void;
  onPreviousPriceChange: (id: string, value: number | null) => void;
}

const priceInputClass = "h-10 w-[115px] rounded-full border border-outline px-2";

export function MasterPricesDialog({ open, settings, onClose, onPriceChange, onPreviousPriceChange }: MasterPricesDialogProps) {
  return (
    <Dialog open={open} title="مدیریت قیمت مادر" onClose={onClose}>
      <p className="mb-3 text-sm leading-7 text-caption">قیمت اولیه همه محصولات ۱۰۰۰ تومان و آزمایشی است. قیمت جدید در فرمول تعداد × قیمت واحد اعمال می‌شود. پاک‌کردن قیمت جدید، مبنای ۱۰۰۰ را برمی‌گرداند.</p>
      <p className="mb-5 text-[12px] leading-6 text-caption">درصد تغییر، مطابق اکسل: (قیمت جدید ÷ قبلی − ۱) × ۱۰۰. قیمت قبلی خالی یعنی بدون مقایسه؛ با مبنای صفر، درصد تعریف نمی‌شود.</p>
      <table className="w-full border-separate border-spacing-y-2 text-right text-[12px]">
        <thead><tr>
          {["کد", "محصول", "دسته", "مبنا", "قیمت جدید", "قیمت قبلی", "تغییر"].map((label) => <th key={label} className="bg-lavender px-2 py-3 font-medium first:rounded-r-full last:rounded-l-full">{label}</th>)}
        </tr></thead>
        <tbody>
          {PRODUCTS.filter((product) => product.id !== OMITTED_PRODUCT_ID).map((product) => {
            const current = getMasterPrice(product, settings);
            const previous = getPreviousPrice(product, settings);
            const change = comparePrices(current, previous);
            return (
              <tr key={product.id}>
                <td className="px-2 py-2 text-[10px] font-light"><bdi>{product.id}</bdi></td>
                <td className="max-w-[250px] px-2 py-2">{product.name}</td>
                <td className="px-2 py-2">{GROUP_LABELS[product.group]}</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatMoney(product.price)}</td>
                <td className="px-2 py-2"><NumberInput value={current} label={`قیمت مادر ${product.name}`} onChange={(value) => onPriceChange(product.id, value)} className={priceInputClass} /></td>
                <td className="px-2 py-2"><NumberInput value={previous} placeholder="اختیاری" label={`قیمت قبلی ${product.name}`} onChange={(value) => onPreviousPriceChange(product.id, value)} className={priceInputClass} /></td>
                <td className="whitespace-nowrap px-2 py-2 text-center"><bdi>{change.ratio === null ? "—" : `${formatNumber(change.ratio * 100)}٪`}</bdi><small className="block text-caption">{change.status}</small></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Dialog>
  );
}
