import type { QuoteSettings } from "@/lib/price-manager/types";

/** Keep assumptions visible; these files do not certify an engineering design. */
export function PricingSourceNotice({ settings }: { settings: QuoteSettings }) {
  return (
    <div className="mt-5 rounded-2xl bg-lavender/20 px-5 py-3 text-[11px] leading-6 text-brand">
      <p>نسخه آزمایشی: قیمت‌های اولیه ۱۰۰۰ تومان هستند، نه قیمت واقعی فروش. تعدادهای اکسل فقط به ۶، ۷ و ۸ توقف وابسته‌اند. برندهای موتور در این نمونه قیمت برابر دارند.</p>
      {settings.capacity === "8" && <p className="text-amber-800">ظرفیت ۸ نفر، موتور ۱۱ کیلووات را انتخاب می‌کند. اکسل ضریب یا تعداد جداگانه برای سایر اقلام ۸ نفره ندارد؛ مقادیر فعلی مبنای آزمایش‌اند، نه تأیید فنی.</p>}
      {settings.motor === "gearless" && <p className="text-amber-800">قوانین تفاوت تجهیزات گیرلس در فایل‌ها موجود نیست. انتخاب آن به معنی تأیید سازگاری این فهرست یا برندها نیست.</p>}
    </div>
  );
}
