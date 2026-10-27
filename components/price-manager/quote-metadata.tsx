import { MetaIcon } from "@/components/ui/icons";
import { getPackageLabel } from "@/lib/price-manager/constants";
import { formatNumber } from "@/lib/price-manager/format";
import type { QuoteSettings } from "@/lib/price-manager/types";

export function QuoteMetadata({ settings, compact = false }: { settings: QuoteSettings; compact?: boolean }) {
  const items = [
    { kind: "motor" as const, label: "نوع موتور:", value: settings.motor === "gearbox" ? "موتور گیربکس" : "موتور گیرلس" },
    { kind: "package" as const, label: "نوع پکیج:", value: getPackageLabel(settings.pack) },
    { kind: "stops" as const, label: "تعداد توقف:", value: `آسانسور ${formatNumber(settings.stops)} توقف` },
    { kind: "capacity" as const, label: "ظرفیت نفرات:", value: settings.capacity === "8" ? "۸ نفر" : "۴ تا ۶ نفر" },
  ];

  return (
    <dl className={`grid grid-cols-[0.83fr_1.17fr] ${compact ? "gap-x-2 gap-y-2" : "gap-x-[14px] gap-y-[14px]"}`}>
      {items.map((item) => (
        <div key={item.kind} className={`flex min-w-0 items-center overflow-hidden rounded-full border border-outline ${compact ? "h-8 text-[10px]" : "h-[50px] text-[13px]"}`}>
          <dt className={`flex h-full shrink-0 items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand to-brand-end font-medium text-white ${compact ? "w-[97px] px-2" : "w-[166px] px-4"}`}>
            <MetaIcon kind={item.kind} className={compact ? "size-3" : "size-4"} />
            {item.label}
          </dt>
          <dd className={`min-w-0 flex-1 truncate px-3 text-center font-light ${item.kind === "package" && !compact ? "text-[12px]" : ""}`} title={item.value}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
