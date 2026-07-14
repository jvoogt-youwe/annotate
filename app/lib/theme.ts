import type { Category, Severity } from "./types";

// `color` is the raw brand swatch — used for decorative fills (pin/avatar circle
// backgrounds, borders, tint accents) where it isn't read as text.
// `text` is a darkened, WCAG AA-safe (>=4.5:1 on white/off-white) variant of the
// same hue, used anywhere the color is the foreground of readable text (labels,
// select values). Several brand swatches (light blue, green, amber, muted grey)
// don't reach 4.5:1 as text at full brightness, so `text` trades a bit of brand
// saturation for legibility instead of introducing an unrelated color.
export const CAT: Record<Category, { color: string; text: string; accent: string; label: string }> = {
  UX:   { color: "#e40046", text: "#e40046", accent: "#e4004615", label: "UX" },
  A11y: { color: "#76B4FD", text: "#036eeb", accent: "#76B4FD15", label: "Accessibility" },
  CRO:  { color: "#00c48c", text: "#008760", accent: "#00c48c15", label: "CRO" },
  Perf: { color: "#f5a623", text: "#a16707", accent: "#f5a62315", label: "Performance" },
  Idea: { color: "#8b5cf6", text: "#8452f5", accent: "#8b5cf615", label: "Idea" },
};

export const SEV: Record<Severity, { color: string; text: string; pinText: string; bg: string }> = {
  // pinText is the foreground color for the severity's solid-color pin/avatar
  // circle — white where the swatch is dark enough (Critical), ink otherwise.
  Critical: { color: "#e40046", text: "#e40046", pinText: "#ffffff", bg: "#e4004618" },
  High:     { color: "#f5a623", text: "#a16707", pinText: "#151515", bg: "#f5a62318" },
  Medium:   { color: "#76B4FD", text: "#036eeb", pinText: "#151515", bg: "#76B4FD18" },
  Low:      { color: "#9a9a9a", text: "#767676", pinText: "#151515", bg: "#9a9a9a18" },
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
