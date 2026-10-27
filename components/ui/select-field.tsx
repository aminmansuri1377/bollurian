import { ChevronIcon } from "./icons";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
}

export function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <label htmlFor={id} className="block text-right">
      <span className="mb-2 block px-2 text-[13px] font-medium leading-5 text-caption">{label}</span>
      <span className="relative block">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-[50px] w-full cursor-pointer appearance-none rounded-full border border-brand bg-white pr-[16px] pl-10 text-[13px] font-light text-brand outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-wait"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronIcon className="pointer-events-none absolute top-1/2 left-[27px] h-2 w-3 -translate-y-1/2" />
      </span>
    </label>
  );
}
