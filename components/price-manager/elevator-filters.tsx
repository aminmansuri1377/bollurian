import type { FormEvent } from "react";
import { PACKAGE_OPTIONS } from "@/lib/price-manager/constants";
import { formatNumber } from "@/lib/price-manager/format";
import type { Capacity, MotorType, PackageId, QuoteSettings } from "@/lib/price-manager/types";
import { SelectField } from "@/components/ui/select-field";

interface ElevatorFiltersProps {
  settings: QuoteSettings;
  disabled: boolean;
  onChange: (patch: Partial<QuoteSettings>) => void;
  onBuildList: () => void;
}

const stopOptions = Array.from({ length: 13 }, (_, index) => ({
  value: index + 1,
  label: `آسانسور ${formatNumber(index + 1)} توقف`,
}));

export function ElevatorFilters({ settings, disabled, onChange, onBuildList }: ElevatorFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBuildList();
  }

  return (
    <form onSubmit={handleSubmit} dir="rtl" aria-label="انتخاب مشخصات آسانسور" className="h-[548px] w-[378px] rounded-[30px] bg-white px-[42px] pt-[28px] pb-[28px] text-brand">
      <h2 className="mb-[23px] whitespace-nowrap text-[26px] font-black leading-9 tracking-[-0.7px]">چه آسانسوری می‌خواهید؟</h2>
      <fieldset disabled={disabled} className="min-w-0">
        <div className="flex flex-col gap-[14px]">
          <SelectField
            id="motor-type"
            label="نوع موتور آسانسور"
            value={settings.motor}
            options={[{ value: "gearbox", label: "آسانسور گیربکس" }, { value: "gearless", label: "آسانسور گیرلس" }]}
            onChange={(motor) => onChange({ motor: motor as MotorType })}
          />
          <SelectField
            id="stop-count"
            label="تعداد توقف"
            value={settings.stops}
            options={stopOptions}
            onChange={(stops) => onChange({ stops: Number(stops), quantities: {} })}
          />
          <SelectField
            id="passenger-capacity"
            label="ظرفیت نفرات"
            value={settings.capacity}
            options={[{ value: "4-6", label: "۴ تا ۶ نفر" }, { value: "8", label: "۸ نفر" }]}
            onChange={(capacity) => onChange({ capacity: capacity as Capacity })}
          />
          <SelectField
            id="package-type"
            label="نوع پکیج"
            value={settings.pack}
            options={PACKAGE_OPTIONS}
            onChange={(pack) => onChange({ pack: pack as PackageId, excluded: [] })}
          />
        </div>
        <button type="submit" className="mt-[36px] h-[43px] w-full cursor-pointer rounded-full bg-linear-to-r from-brand to-brand-end text-[14px] font-bold text-white outline-none transition-shadow hover:shadow-lg hover:shadow-brand/15 focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-wait disabled:opacity-60">
          ساختن لیست
        </button>
      </fieldset>
    </form>
  );
}
