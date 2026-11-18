import { ChevronIcon } from "./icons";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  compact?: boolean;
}

export function SelectField({ id, label, value, options, onChange, compact = false }: SelectFieldProps) {
  return (
    <label htmlFor={id} className="block text-right">
      <span className={`${compact ? "mb-1 text-[12px] leading-4" : "mb-2 text-[13px] leading-5"} block px-2 font-medium text-caption`}>{label}</span>
      <span className="relative block">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${compact ? "h-[34px] pr-3 pl-8 text-[13px]" : "h-[50px] pr-[16px] pl-10 text-[13px]"} w-full cursor-pointer appearance-none rounded-full border border-brand bg-white font-light text-brand outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-wait`}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronIcon className={`pointer-events-none absolute top-1/2 h-2 w-3 -translate-y-1/2 ${compact ? "left-4" : "left-[27px]"}`} />
      </span>
    </label>
  );
}
