import Image from "next/image";
import { groupRowsByCategory } from "@/lib/price-manager/calculations";
import { formatMoney } from "@/lib/price-manager/format";
import type { QuoteSettings, QuoteSummary } from "@/lib/price-manager/types";
import { BrandWordmark } from "./brand-wordmark";
import { QuotePrintRow } from "./quote-print-row";
import { QuoteMetadata } from "./quote-metadata";
import { PricingSourceNotice } from "./pricing-source-notice";

interface QuotePrintDocumentProps {
  settings: QuoteSettings;
  quote: QuoteSummary;
  today: string;
}

/** A real paginated table: no hero, controls, screenshots, or clipped long lists. */
export function QuotePrintDocument({
  settings,
  quote,
  today,
}: QuotePrintDocumentProps) {
  return (
    <section
      dir="rtl"
      aria-label="نسخه چاپی پیش‌فاکتور"
      className="hidden text-brand print:block"
    >
      <header className="mb-5 break-inside-avoid">
        <Image
          src="/logo.png"
          alt="Bollourian Elevator"
          width={240}
          height={83}
          className="mx-auto mb-5 h-[83px] w-[240px] object-contain"
        />
        <QuoteMetadata settings={settings} compact />
        {/* <PricingSourceNotice settings={settings} /> */}
        <div className="mt-3 flex justify-between text-[10px]">
          <span>مشتری: {settings.customer || "—"}</span>
          <span>
            تلفن: <bdi>{settings.customerPhone || "—"}</bdi>
          </span>
          <span>شماره: {settings.quoteNumber || "—"}</span>
          <span>تاریخ: {today}</span>
        </div>
      </header>
      <table className="w-full table-fixed border-separate [border-spacing:5px_6px] text-[12px] leading-[14px]">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead className="[display:table-header-group]">
          <tr>
            {[
              "شرح کالا / برند",
              "تعداد",
              "قیمت واحد (تومان)",
              "مبلغ کل (تومان)",
            ].map((label) => (
              <th
                key={label}
                className="h-7 rounded-full bg-lavender px-2 py-1 align-middle text-center font-medium leading-[14px]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {groupRowsByCategory(quote.enabledRows).map((section) => (
          <tbody key={section.category}>
            <tr className="break-after-avoid break-inside-avoid [page-break-after:avoid]">
              <th
                colSpan={4}
                className="h-6 rounded-full bg-lavender px-3 py-1 text-right align-middle text-[10px] font-medium leading-[14px]"
              >
                {section.label}
              </th>
            </tr>
            {section.rows.map((row, index) => (
              <QuotePrintRow
                key={row.product.id}
                row={row}
                rowNumber={section.firstRowNumber + index}
              />
            ))}
            {section.hasSubtotal && (
              <tr className="break-inside-avoid [page-break-inside:avoid]">
                <td
                  colSpan={3}
                  className="px-3 py-1 text-left align-middle font-medium"
                >
                  جمع {section.label}
                </td>
                <td className="whitespace-nowrap rounded-[14px] border border-brand px-1 py-1 text-center align-middle font-medium tabular-nums">
                  {formatMoney(section.subtotal)}
                </td>
              </tr>
            )}
          </tbody>
        ))}
      </table>
      <footer className="mt-4 break-inside-avoid">
        <div className="flex justify-end border-t border-outline/40 pt-4 text-[11px]">
          <strong>جمع کل: {formatMoney(quote.total)} تومان</strong>
        </div>
        <div className="mt-10 flex justify-around text-[10px]">
          <span>مهر و امضای فروشنده</span>
          <span>امضای خریدار</span>
        </div>
        <div
          aria-hidden="true"
          className="mt-10 h-[55px] overflow-hidden border-t border-outline/30 pt-5"
        >
          <BrandWordmark showSubtitle={false} className="mx-auto w-[480px]" />
        </div>
      </footer>
    </section>
  );
}
