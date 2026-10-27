import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ChevronIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 12 8" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M1 1h10L6 7z" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2.5" fill="white" />
      <circle cx="15" cy="17" r="2.5" fill="white" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" />
    </svg>
  );
}

export function MetaIcon({ kind, ...props }: IconProps & { kind: "motor" | "package" | "stops" | "capacity" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {kind === "motor" && <><rect x="5" y="7" width="14" height="10" rx="2" /><path d="M8 7V4h8v3M2 10v4m20-4v4M8 10v4m4-4v4m4-4v4" /></>}
      {kind === "package" && <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Zm0 0 8 4 8-4M12 11v10M8 5l8 4" /></>}
      {kind === "stops" && <><path d="M4 6h3m3 0h10M4 12h3m3 0h10M4 18h3m3 0h10" /></>}
      {kind === "capacity" && <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2" /></>}
    </svg>
  );
}
