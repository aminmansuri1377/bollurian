import type { FormEvent } from "react";
import {
  PACKAGE_OPTIONS,
  SUPPORTED_STOPS,
  isSupportedStop,
} from "@/lib/price-manager/constants";
import { formatNumber } from "@/lib/price-manager/format";
import type {
  Capacity,
  MotorType,
  PackageId,
  QuoteSettings,
} from "@/lib/price-manager/types";
import { SelectField } from "@/components/ui/select-field";

interface ElevatorFiltersProps {
  settings: QuoteSettings;
  disabled: boolean;
  onChange: (patch: Partial<QuoteSettings>) => void;
  onBuildList: () => void;
}

const stopOptions = SUPPORTED_STOPS.map((stop) => ({
  value: stop,
  label: `آسانسور ${formatNumber(stop)} توقف`,
}));

export function ElevatorFilters({
  settings,
  disabled,
  onChange,
  onBuildList,
}: ElevatorFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBuildList();
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      aria-label="انتخاب مشخصات آسانسور"
      className="mt-[18px] h-[226px] w-[780px] rounded-[26px] bg-white px-[44px] pt-[19px] pb-[16px] text-brand shadow-[0_10px_28px_rgba(2,33,70,0.08)]"
    >
      <h2 className="mb-[12px] text-right text-[20px] font-black leading-7">
        چه آسانسوری می‌خواهید؟
      </h2>
      <fieldset disabled={disabled} className="min-w-0">
        <div className="grid grid-cols-2 gap-x-[28px] gap-y-[10px]">
          <SelectField
            compact
            id="passenger-capacity"
            label="ظرفیت نفرات"
            value={settings.capacity}
            options={[
              { value: "4-6", label: "۴ تا ۶ نفر" },
              { value: "8", label: "۸ نفر" },
            ]}
            onChange={(capacity) => onChange({ capacity: capacity as Capacity })}
          />
          <SelectField
            compact
            id="motor-type"
            label="نوع موتور آسانسور"
            value={settings.motor}
            options={[
              { value: "gearbox", label: "آسانسور گیربکس" },
              // { value: "gearless", label: "آسانسور گیرلس" },
            ]}
            onChange={(motor) => onChange({ motor: motor as MotorType })}
          />
          <SelectField
            compact
            id="stop-count"
            label="تعداد توقف"
            value={settings.stops}
            options={stopOptions}
            onChange={(value) => {
              const stops = Number(value);
              if (isSupportedStop(stops)) onChange({ stops });
            }}
          />
          <SelectField
            compact
            id="package-type"
            label="نوع پکیج"
            value={settings.pack}
            options={PACKAGE_OPTIONS}
            onChange={(pack) => onChange({ pack: pack as PackageId, excluded: [] })}
          />
        </div>
        <button type="submit" className="sr-only">ساختن لیست</button>
      </fieldset>
    </form>
  );
}
