"use client";

import { useState } from "react";
import { formatNumber, normalizeDigits, parseNumericInput } from "@/lib/price-manager/format";

interface NumberInputProps {
  value: number | null;
  label: string;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowNegative?: boolean;
  className?: string;
}

/** Format on blur, not on every keystroke, so decimals and Persian digits stay editable. */
export function NumberInput({ value, label, onChange, placeholder = "نامشخص", allowNegative = false, className = "" }: NumberInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function changeValue(text: string) {
    const normalized = normalizeDigits(text);
    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!pattern.test(normalized)) return;
    setDraft(text);
    if (normalized === "-" || normalized === "." || normalized === "-.") return;
    onChange(parseNumericInput(text));
  }

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      type="text"
      dir="ltr"
      autoComplete="off"
      value={isEditing ? draft : value === null ? "" : formatNumber(value)}
      placeholder={placeholder}
      onFocus={(event) => {
        // Keep the displayed value unchanged on focus so text selection does not jump.
        setDraft(value === null ? "" : formatNumber(value));
        setIsEditing(true);
        event.currentTarget.select();
      }}
      onChange={(event) => changeValue(event.target.value)}
      onBlur={() => setIsEditing(false)}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      className={`min-w-0 bg-transparent text-center tabular-nums outline-none placeholder:text-caption focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-brand/25 ${className}`}
    />
  );
}
