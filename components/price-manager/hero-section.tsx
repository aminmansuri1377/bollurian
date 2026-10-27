import Image from "next/image";
import type { QuoteSettings } from "@/lib/price-manager/types";
import { BrandWordmark } from "./brand-wordmark";
import { ElevatorFilters } from "./elevator-filters";

interface HeroSectionProps {
  settings: QuoteSettings;
  disabled: boolean;
  onChange: (patch: Partial<QuoteSettings>) => void;
  onBuildList: () => void;
}

export function HeroSection(props: HeroSectionProps) {
  return (
    <section aria-label="لیست قیمت آسانسور بلوریان" className="relative isolate h-[618px] w-[1110px] overflow-hidden rounded-[30px] bg-brand">
      <Image src="/hero.png" alt="" fill priority sizes="1110px" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#426b8d]/65 via-[#244f77]/70 to-[#04264b]/90" aria-hidden="true" />

      {/* Explicit LTR grid placement keeps the form on the RIGHT, regardless of the document's RTL direction. */}
      <div dir="ltr" className="grid h-full grid-cols-[596px_378px] gap-12 py-[35px] pr-10 pl-12">
        <div dir="rtl" className="pt-[22px] text-right text-white">
          <BrandWordmark className="h-auto w-[596px] text-white" />
          <h1 className="mt-[28px] text-[30px] font-black leading-[43px]">لیست قیمت آسانسور بلوریان</h1>
          <p className="mt-[9px] text-[14px] font-light leading-[21px] text-white/95">
            با انتخاب نوع موتور، تعداد توقف و ظرفیت آسانسور، لیست تجهیزات مورد نیاز را بسازید.
            قیمت‌ها و تعداد اقلام را بررسی کنید، برند دلخواه را انتخاب کنید و پیش‌فاکتور اختصاصی
            بلوریان را بدون نیاز به اینترنت دریافت کنید.
          </p>
        </div>
        <ElevatorFilters {...props} />
      </div>
    </section>
  );
}
