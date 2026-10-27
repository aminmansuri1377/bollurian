interface RowNumberBadgeProps {
  value: number;
  size?: "screen" | "print";
  className?: string;
}

const sizeClasses = {
  screen: "size-[50px] text-[18px]",
  print: "size-[28px] text-[11px]",
} as const;

/** Three round corners; the physical bottom-left corner joins the row border. */
export function RowNumberBadge({ value, size = "screen", className = "" }: RowNumberBadgeProps) {
  return (
    <span
      dir="ltr"
      className={`inline-flex shrink-0 items-center justify-center rounded-[50%_50%_50%_0] bg-linear-to-r from-brand to-brand-end font-medium leading-none text-white tabular-nums [-webkit-print-color-adjust:exact] [print-color-adjust:exact] ${sizeClasses[size]} ${className}`}
    >
      {String(value)}
    </span>
  );
}
