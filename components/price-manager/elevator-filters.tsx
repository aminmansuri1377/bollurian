import type { FormEvent } from "react";
import {
  GEARBOX_PACKAGE_OPTIONS,
  GEARBOX_STOPS,
  GEARLESS_PACKAGE_OPTIONS,
  GEARLESS_STOPS,
  isSupportedStop,
} from "@/lib/price-manager/constants";
import { formatNumber } from "@/lib/price-manager/format";
import type {
  Capacity,
  MotorType,
  PackageId,
  QuoteSettings,
  RailSelection,
  SupportedStop,
} from "@/lib/price-manager/types";
import { SelectField } from "@/components/ui/select-field";

interface ElevatorFiltersProps {
  settings: QuoteSettings;
  disabled: boolean;
  onChange: (patch: Partial<QuoteSettings>) => void;
  onBuildList: () => void;
}

const GEARLESS_13_RAILS: RailSelection = ["T9", "T16.T89"];

function includesStop(options: readonly SupportedStop[], value: SupportedStop): boolean {
  return options.some((stop) => stop === value);
}

function includesPackage(options: readonly { value: PackageId; label: string }[], value: PackageId): boolean {
  return options.some((option) => option.value === value);
}

export function ElevatorFilters({
  settings,
  disabled,
  onChange,
  onBuildList,
}: ElevatorFiltersProps) {
  const gearless = settings.motor === "gearless";
  const stopValues = gearless ? GEARLESS_STOPS : GEARBOX_STOPS;
  const stopOptions = stopValues.map((stop) => ({
    value: stop,
    label: `آسانسور ${formatNumber(stop)} توقف`,
  }));
  const capacityOptions = gearless
    ? [
        { value: "8", label: "۸ نفر" },
        { value: "13", label: "۱۳ نفر" },
      ]
    : [
        { value: "4-6", label: "۴ تا ۶ نفر" },
        { value: "8", label: "۸ نفر" },
      ];
  const packageOptions = gearless ? GEARLESS_PACKAGE_OPTIONS : GEARBOX_PACKAGE_OPTIONS;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBuildList();
  }

  function handleMotorChange(value: string) {
    const motor = value as MotorType;

    if (motor === "gearless") {
      const capacity: Capacity = settings.capacity === "8" || settings.capacity === "13" ? settings.capacity : "8";
      const pack: PackageId = includesPackage(GEARLESS_PACKAGE_OPTIONS, settings.pack)
        ? settings.pack
        : settings.pack.startsWith("full-")
          ? "gearless-full-1to1-auto"
          : "gearless-mech-1to1-auto";

      onChange({
        motor,
        capacity,
        stops: includesStop(GEARLESS_STOPS, settings.stops) ? settings.stops : 4,
        pack,
        excluded: [],
        ...(capacity === "13" ? { railTypes: GEARLESS_13_RAILS } : {}),
      });
      return;
    }

    const pack: PackageId = includesPackage(GEARBOX_PACKAGE_OPTIONS, settings.pack)
      ? settings.pack
      : settings.pack === "rail"
        ? "rail"
        : settings.pack.startsWith("gearless-full-")
          ? "full-auto"
          : "mech-auto";

    onChange({
      motor,
      capacity: settings.capacity === "13" ? "8" : settings.capacity,
      stops: includesStop(GEARBOX_STOPS, settings.stops) ? settings.stops : 10,
      pack,
      excluded: [],
    });
  }

  function handleCapacityChange(value: string) {
    const capacity = value as Capacity;
    onChange({
      capacity,
      ...(gearless && capacity === "13" ? { railTypes: GEARLESS_13_RAILS } : {}),
    });
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
            options={capacityOptions}
            onChange={handleCapacityChange}
          />
          <SelectField
            compact
            id="motor-type"
            label="نوع موتور آسانسور"
            value={settings.motor}
            options={[
              { value: "gearbox", label: "آسانسور گیربکس" },
              { value: "gearless", label: "آسانسور گیرلس" },
            ]}
            onChange={handleMotorChange}
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
            options={packageOptions}
            onChange={(pack) => onChange({ pack: pack as PackageId, excluded: [] })}
          />
        </div>
        <button type="submit" className="sr-only">ساختن لیست</button>
      </fieldset>
    </form>
  );
}
