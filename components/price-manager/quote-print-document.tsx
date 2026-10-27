import Image from "next/image";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteSettings, QuoteSummary } from "@/lib/price-manager/types";
import { BrandWordmark } from "./brand-wordmark";
import { QuoteMetadata } from "./quote-metadata";
import { PricingSourceNotice } from "./pricing-source-notice";

interface QuotePrintDocumentProps {
  settings: QuoteSettings;
  quote: QuoteSummary;
  today: string;
}

/** A real paginated table: no hero, controls, screenshots, or clipped long lists. */
export function QuotePrintDocument({ settings, quote, today }: QuotePrintDocumentProps) {
  return (
    <section dir="rtl" aria-label="نسخه چاپی پیش‌فاکتور" className="hidden text-brand print:block">
      <header className="mb-5 break-inside-avoid">
        <Image src="/logo.png" alt="Bollourian Elevator" width={240} height={83} className="mx-auto mb-5 h-[83px] w-[240px] object-contain" />
        <QuoteMetadata settings={settings} compact />
        <PricingSourceNotice settings={settings} />
        <div className="mt-3 flex justify-between text-[10px]">
          <span>مشتری: {settings.customer || "—"}</span>
          <span>شماره: {settings.quoteNumber || "—"}</span>
          <span>تاریخ: {today}</span>
        </div>
      </header>
      <table className="w-full table-fixed border-separate [border-spacing:5px_7px] text-[9px]">
        <colgroup><col className="w-[42%]" /><col className="w-[10%]" /><col className="w-[24%]" /><col className="w-[24%]" /></colgroup>
        <thead className="[display:table-header-group]">
          <tr>
            {["شرح کالا / برند", "تعداد", "قیمت واحد (تومان)", "مبلغ کل (تومان)"].map((label) => (
              <th key={label} className="rounded-full bg-lavender px-2 py-2.5 text-center font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quote.enabledRows.map((row, index) => (
            <tr key={row.product.id} className="break-inside-avoid [page-break-inside:avoid]">
              <td className="rounded-[18px] border border-outline px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">{formatNumber(index + 1)}</span>
                  <span className="break-words leading-5">{row.product.name}{row.brand && !row.product.name.includes(row.brand) ? ` — ${row.brand}` : ""}</span>
                </div>
              </td>
              <td className="rounded-[18px] border border-outline px-1 py-2 text-center leading-5">{row.quantity === null ? "—" : formatNumber(row.quantity)}<span className="block text-[8px] text-caption">{row.product.unit}</span></td>
              <td className="rounded-[18px] border border-outline px-1 py-2 text-center tabular-nums">{formatMoney(row.unitPrice)}</td>
              <td className="rounded-[18px] border border-outline px-1 py-2 text-center tabular-nums">{formatMoney(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="mt-4 break-inside-avoid">
        <div className="flex justify-between border-t border-outline/40 pt-4 text-[11px]">
          <span>تعدیل اختیاری (خارج از اکسل): {formatNumber(settings.rate)}٪</span>
          <strong>جمع کل: {formatMoney(quote.total)} تومان</strong>
        </div>
        <div className="mt-10 flex justify-around text-[10px]"><span>مهر و امضای فروشنده</span><span>امضای خریدار</span></div>
        <div aria-hidden="true" className="mt-10 h-[55px] overflow-hidden border-t border-outline/30 pt-5"><BrandWordmark showSubtitle={false} className="mx-auto w-[480px]" /></div>
      </footer>
    </section>
  );
}
