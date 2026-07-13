import { CAT, SEV, LIST_W } from "../../lib/theme";
import type { Annotation, Page } from "../../lib/types";

// ─── COMMENTS LIST (right drawer, compact summaries) ──────────────────────────
export function CommentsList({ page, selectedId, onSelect, highlightedId, onHighlight, onClose }: {
  page: Page | null | undefined; selectedId: string | null;
  onSelect: (a: Annotation) => void;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  onClose: () => void;
}) {
  const annotations: Annotation[] = page?.annotations || [];

  return (
    <div style={{ width: LIST_W }} className="h-full flex flex-col bg-brand-white">
      <div className="flex items-center justify-between px-4 h-14 border-b border-brand-border shrink-0">
        <div>
          <p className="text-sm font-bold text-brand-ink leading-tight">Annotations</p>
          <p className="text-xs text-brand-muted mt-0.5">
            {page?.device === "desktop" ? "🖥" : "📱"} {annotations.length} finding{annotations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-brand-muted cursor-pointer text-[22px] leading-none px-2 py-1">×</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {annotations.length === 0 ? (
          <p className="text-brand-muted text-sm text-center px-4 py-12">No annotations yet.</p>
        ) : annotations.map((a: Annotation) => {
          const isSelected = selectedId === a.id;
          const isHL = highlightedId === a.id;
          return (
            <button key={a.id}
              onMouseEnter={() => onHighlight(a.id)}
              onMouseLeave={() => onHighlight(selectedId)}
              onClick={() => { onSelect(a); onHighlight(a.id); }}
              className="w-full text-left px-4 py-3 border-none cursor-pointer flex items-start gap-3 transition-colors duration-100"
              style={{
                background: isSelected ? "#f0f4ff" : isHL ? "#f7f7f8" : "transparent",
                borderLeft: `3px solid ${isSelected ? (SEV[a.severity]?.color || "#e40046") : "transparent"}`,
              }}>
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[13px] font-extrabold text-brand-white mt-px transition-transform duration-[120ms]"
                style={{ background: SEV[a.severity]?.color || "#e40046", transform: isHL ? "scale(1.1)" : "scale(1)" }}>{a.number}</div>
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <span
                    className="text-[11px] font-bold px-[7px] py-0.5 rounded uppercase tracking-[0.04em]"
                    style={{ background: CAT[a.category]?.accent || "#eee", color: CAT[a.category]?.color || "#151515" }}>
                    {CAT[a.category]?.label || a.category}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-brand-ink leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                  {a.title}
                </p>
                <p className="text-xs text-brand-muted mt-[3px]">{a.severity}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
