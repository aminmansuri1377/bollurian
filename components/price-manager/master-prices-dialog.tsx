import { Dialog } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import { getPriceKey, isBrandSelectable, resolveBrand } from "@/lib/price-manager/brand-rules";
import { PRODUCTS } from "@/lib/price-manager/catalog";
import { GROUP_LABELS, OMITTED_PRODUCT_ID } from "@/lib/price-manager/constants";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import { comparePrices, getBaseBrandPrice, getMasterPrice, getPreviousPrice } from "@/lib/price-manager/master-price";
import type { QuoteSettings } from "@/lib/price-manager/types";

interface MasterPricesDialogProps {
  open: boolean;
  settings: QuoteSettings;
  onClose: () => void;
  onPriceChange: (key: string, value: number | null) => void;
  onPreviousPriceChange: (key: string, value: number | null) => void;
}

const priceInputClass = "h-10 w-[115px] rounded-full border border-outline px-2";

export function MasterPricesDialog({ open, settings, onClose, onPriceChange, onPreviousPriceChange }: MasterPricesDialogProps) {
  // One row per brand for products whose brand can be chosen; every other product has a single row.
  const entries = PRODUCTS.filter((product) => product.id !== OMITTED_PRODUCT_ID).flatMap((product) =>
    isBrandSelectable(product) ? product.brands.map((brand) => ({ product, brand })) : [{ product, brand: resolveBrand(product, undefined) }],
  );

  return (
    <Dialog open={open} title="مدیریت قیمت مادر" onClose={onClose}>
      <p className="mb-3 text-sm leading-7 text-caption">قیمت‌های اولیه آزمایشی‌اند (۱۰۰۰ تومان؛ برای محصولات چندبرندی به ترتیب ۱۰۰۰، ۲۰۰۰ و ۳۰۰۰). قیمت جدید در فرمول تعداد × قیمت واحد اعمال می‌شود. پاک‌کردن قیمت جدید، ستون «مبنا» را برمی‌گرداند. قیمت‌ها فقط از همین‌جا تغییر می‌کنند.</p>
      <p className="mb-3 text-[12px] leading-6 text-caption">محصولاتی که چند برند دارند، برای هر برند یک ردیف و یک قیمت جداگانه دارند؛ با انتخاب برند در لیست اصلی، قیمت همان برند محاسبه می‌شود.</p>
      <p className="mb-5 text-[12px] leading-6 text-caption">درصد تغییر، مطابق اکسل: (قیمت جدید ÷ قبلی − ۱) × ۱۰۰. قیمت قبلی خالی یعنی بدون مقایسه؛ با مبنای صفر، درصد تعریف نمی‌شود.</p>
      <table className="w-full border-separate border-spacing-y-2 text-right text-[12px]">
        <thead><tr>
          {["کد", "محصول", "دسته", "مبنا", "قیمت جدید", "قیمت قبلی", "تغییر"].map((label) => <th key={label} className="bg-lavender px-2 py-3 font-medium first:rounded-r-full last:rounded-l-full">{label}</th>)}
        </tr></thead>
        <tbody>
          {entries.map(({ product, brand }) => {
            const selectable = isBrandSelectable(product);
            const priceKey = getPriceKey(product, brand);
            const current = getMasterPrice(product, settings, brand);
            const previous = getPreviousPrice(product, settings, brand);
            const change = comparePrices(current, previous);
            const title = selectable ? `${product.name} - ${brand}` : product.name;
            return (
              <tr key={priceKey}>
                <td className="px-2 py-2 text-[10px] font-light"><bdi>{product.id}</bdi></td>
                <td className="max-w-[250px] px-2 py-2">{title}</td>
                <td className="px-2 py-2">{GROUP_LABELS[product.group]}</td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatMoney(getBaseBrandPrice(product, brand))}</td>
                <td className="px-2 py-2"><NumberInput value={current} label={`قیمت مادر ${title}`} onChange={(value) => onPriceChange(priceKey, value)} className={priceInputClass} /></td>
                <td className="px-2 py-2"><NumberInput value={previous} placeholder="اختیاری" label={`قیمت قبلی ${title}`} onChange={(value) => onPreviousPriceChange(priceKey, value)} className={priceInputClass} /></td>
                <td className="whitespace-nowrap px-2 py-2 text-center"><bdi>{change.ratio === null ? "—" : `${formatNumber(change.ratio * 100)}٪`}</bdi><small className="block text-caption">{change.status}</small></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Dialog>
  );
}
