import { hasRail } from "@/lib/price-manager/package-rules";
import { shouldMergeRailBolts } from "@/lib/price-manager/rail-rules";
import type { QuoteSettings } from "@/lib/price-manager/types";

/** Keep assumptions visible; these files do not certify an engineering design. */
export function PricingSourceNotice({ settings }: { settings: QuoteSettings }) {
  return (
    <div className="mt-5 rounded-2xl bg-lavender/20 px-5 py-3 text-[11px] leading-6 text-brand">
      <p>نسخه آزمایشی: قیمت‌های اولیه نمونه‌اند (۱۰۰۰ تومان؛ برندها ۱۰۰۰، ۲۰۰۰ و ۳۰۰۰ به ترتیب)، نه قیمت واقعی فروش. تعداد هر توقف (۳ تا ۱۰) دقیقاً از پیش‌فاکتور «صفر تا صد» همان توقف خوانده می‌شود. هر برند در «مدیریت قیمت مادر» قیمت منحصربه‌فرد خودش را دارد.</p>
      {settings.capacity === "8" && <p className="text-amber-800">ظرفیت ۸ نفر: موتور ۷٫۳ کیلووات، تابلو فرمان ۱۱ کیلووات و فلکه ۴۰×۵ انتخاب می‌شوند ، سیم بکسل ۱۰ پنج‌برابر عدد شرح کالا و سربکسل ۱۰ عدد، کرپی ۱۰ سی‌ودو عدد و وزنه ۱۰۰۰ عدد است. تعداد سایر اقلام ۸ نفره مانند ۴ تا ۶ نفر است.</p>}
      {hasRail(settings.pack) && shouldMergeRailBolts(settings.railTypes) && <p className="text-amber-800">با ریل T9 و T16، همهٔ پیچ و مهره‌های ریل «پیچ و مهره 12» هستند و تعداد پیچ و مهره 10 و 8 به آن اضافه شده است.</p>}
      {settings.motor === "gearless" && <p className="text-amber-800">قوانین تفاوت تجهیزات گیرلس در فایل‌ها موجود نیست. انتخاب آن به معنی تأیید سازگاری این فهرست یا برندها نیست.</p>}
    </div>
  );
}
