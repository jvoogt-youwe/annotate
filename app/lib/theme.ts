import type { Category, Severity } from "./types";

export const CAT: Record<Category, { color: string; accent: string; label: string }> = {
  UX:   { color: "#e40046", accent: "#e4004615", label: "UX" },
  A11y: { color: "#76B4FD", accent: "#76B4FD15", label: "Accessibility" },
  CRO:  { color: "#00c48c", accent: "#00c48c15", label: "CRO" },
  Perf: { color: "#f5a623", accent: "#f5a62315", label: "Performance" },
  Idea: { color: "#8b5cf6", accent: "#8b5cf615", label: "Idea" },
};

export const SEV: Record<Severity, { color: string; bg: string }> = {
  Critical: { color: "#e40046", bg: "#e4004618" },
  High:     { color: "#f5a623", bg: "#f5a62318" },
  Medium:   { color: "#76B4FD", bg: "#76B4FD18" },
  Low:      { color: "#9a9a9a", bg: "#9a9a9a18" },
};

export const LIST_W = 280;
export const DETAIL_W = 360;

// Shared className fragments used across several report components.
export const LBL_CLASS =
  "block mb-[7px] text-xs font-bold text-[#6b7280] uppercase tracking-[0.07em]";

export const FIELD_CLASS =
  "w-full bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-[14px] py-[10px] text-[13px] font-normal font-[Arial,sans-serif] text-[#151515] leading-[1.5]";

export function genId() {
  return Math.random().toString(36).slice(2, 9);
}
