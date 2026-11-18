import Image from "next/image";
import type { QuoteSettings } from "@/lib/price-manager/types";
import { ElevatorFilters } from "./elevator-filters";
import { HeroLogo } from "./hero-logo";

interface HeroSectionProps {
  settings: QuoteSettings;
  disabled: boolean;
  onChange: (patch: Partial<QuoteSettings>) => void;
  onBuildList: () => void;
}

export function HeroSection(props: HeroSectionProps) {
  return (
    <section
      aria-label="لیست قیمت آسانسور بلوریان"
      className="relative isolate h-[480px] w-[1110px] overflow-hidden rounded-[28px] bg-brand"
    >
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="1110px"
        className="-z-20 object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-10 bg-linear-to-b from-[#416b90]/60 via-[#244f77]/68 to-[#062c54]/90"
        aria-hidden="true"
      />

      <div className="flex h-full flex-col items-center px-16 pt-[20px] text-white">
        <HeroLogo className="h-auto w-[150px] text-white" />
        <h1 className="mt-3 text-[23px] font-black leading-8">
          لیست قیمت آسانسور بلوریان
        </h1>
        <p className="mt-2 max-w-[760px] text-center text-[11px] font-light leading-[18px] text-white/95">
          با انتخاب نوع موتور، تعداد توقف و ظرفیت آسانسور، لیست تجهیزات مورد نیاز را بسازید. قیمت‌ها و تعداد اقلام را بررسی کنید، برند دلخواه را انتخاب کنید و پیش‌فاکتور اختصاصی بلوریان را بدون نیاز به اینترنت دریافت کنید.
        </p>
        <ElevatorFilters {...props} />
      </div>
    </section>
  );
}
