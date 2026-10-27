import Image from "next/image";
import type { ReactNode } from "react";
import { formatMoney, formatNumber } from "@/lib/price-manager/format";
import type { QuoteSettings, QuoteSummary } from "@/lib/price-manager/types";
import { BrandWordmark } from "./brand-wordmark";
import { QuoteMetadata } from "./quote-metadata";
import { PricingSourceNotice } from "./pricing-source-notice";

interface QuoteSheetProps {
  settings: QuoteSettings;
  quote: QuoteSummary;
  disabled: boolean;
  isPrinting: boolean;
  onPrint: () => void;
  children: ReactNode;
}

export function QuoteSheet({ settings, quote, disabled, isPrinting, onPrint, children }: QuoteSheetProps) {
  const canPrint = !disabled && !isPrinting && quote.enabledRows.length > 0 && quote.incompleteRows.length === 0;

  return (
    <section id="results" aria-label="پیش‌فاکتور بلوریان" className="mt-[48px] scroll-mt-5 rounded-[28px] border border-outline bg-white">
      <div className="px-[82px] pt-[40px]">
        <header className="mb-[42px] flex justify-center">
          <Image src="/logo.png" alt="Bollourian Elevator — آسانسور بلوریان" width={350} height={120} className="h-[120px] w-[350px] object-contain" />
        </header>
        <QuoteMetadata settings={settings} />
        <PricingSourceNotice settings={settings} />
        <div className="mt-[40px]">{children}</div>

        <div className="mt-[38px] flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={onPrint}
            disabled={!canPrint}
            title={quote.incompleteRows.length ? "ابتدا قیمت و تعداد ردیف‌های ناقص را کامل کنید" : "چاپ / ذخیره به صورت PDF"}
            className="h-[43px] w-[166px] shrink-0 cursor-pointer rounded-full bg-linear-to-r from-brand to-brand-end text-[13px] text-white outline-none transition-shadow hover:shadow-lg hover:shadow-brand/15 focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPrinting ? "آماده‌سازی…" : "خروجی PDF"}
          </button>
          <p className="text-[13px] font-light">
            {quote.incompleteRows.length ? "جمع اقلام تکمیل‌شده:" : "جمع کل:"}
            <strong className="mr-3 text-[17px] font-medium tabular-nums">{formatMoney(quote.total)}</strong>
            <span className="mr-1 text-[12px]">تومان</span>
          </p>
        </div>
        {quote.incompleteRows.length > 0 && (
          <p className="mt-4 text-[12px] leading-6 text-amber-800" role="status">
            قیمت یا تعداد {formatNumber(quote.incompleteRows.length)} ردیف نیاز به تکمیل دارد. کادرهای نارنجی را بررسی کنید؛ مبلغی برای آن‌ها حدس زده نشده است.
          </p>
        )}
      </div>
      <footer aria-hidden="true" className="mt-[42px] h-[128px] overflow-hidden rounded-b-[28px] px-[132px] pt-0">
        <div className="mx-auto mb-8 h-px w-[530px] bg-linear-to-r from-transparent via-outline to-transparent" />
        <BrandWordmark showSubtitle={false} className="mx-auto h-auto w-[810px] text-brand" />
      </footer>
    </section>
  );
}
