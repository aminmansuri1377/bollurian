import { Dialog } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import { PRODUCTS } from "@/lib/price-manager/catalog";
import { GROUP_LABELS, OMITTED_PRODUCT_ID } from "@/lib/price-manager/constants";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteSettings } from "@/lib/price-manager/types";

interface MasterPricesDialogProps {
  open: boolean;
  settings: QuoteSettings;
  onClose: () => void;
  onPriceChange: (id: string, value: number | null) => void;
}

export function MasterPricesDialog({ open, settings, onClose, onPriceChange }: MasterPricesDialogProps) {
  return (
    <Dialog open={open} title="مدیریت قیمت مادر" onClose={onClose}>
      <p className="mb-5 text-sm leading-7 text-caption">قیمت‌ها به تومان هستند. تغییرات این جدول در پیش‌فاکتور اعمال و به‌صورت خودکار ذخیره می‌شوند. پاک‌کردن مقدار و خروج از کادر، قیمت اولیه را برمی‌گرداند.</p>
      <table className="w-full border-separate border-spacing-y-2 text-right text-[12px]">
        <thead>
          <tr>
            {["کد", "محصول", "دسته", "قیمت اولیه", "قیمت جدید", "تغییر"].map((label) => <th key={label} className="bg-lavender px-3 py-3 font-medium first:rounded-r-full last:rounded-l-full">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {PRODUCTS.filter((product) => product.id !== OMITTED_PRODUCT_ID).map((product) => {
            const price = settings.prices[product.id] ?? product.price;
            const percentage = product.price && price !== null ? ((price / product.price) - 1) * 100 : null;
            return (
              <tr key={product.id}>
                <td className="px-3 py-2 font-light"><bdi>{product.id}</bdi></td>
                <td className="max-w-[320px] px-3 py-2">{product.name}</td>
                <td className="px-3 py-2">{GROUP_LABELS[product.group]}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatMoney(product.price)}</td>
                <td className="w-[160px] px-3 py-2">
                  <NumberInput value={price} label={`قیمت مادر ${product.name}`} onChange={(value) => onPriceChange(product.id, value)} className="h-10 w-[145px] rounded-full border border-outline px-2" />
                </td>
                <td className="whitespace-nowrap px-3 py-2" dir="ltr">{percentage === null ? "—" : `${formatNumber(percentage)}٪`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Dialog>
  );
}
