import type { Page } from "../../lib/types";

// ─── PAGES SIDEBAR ────────────────────────────────────────────────────────────
export function PagesSidebar({
  pages, activePageId, showOverview, readonly, onShowOverview, onSelectPage, onDeletePage,
}: {
  pages: Page[];
  activePageId: string | null;
  showOverview: boolean;
  readonly: boolean;
  onShowOverview: () => void;
  onSelectPage: (id: string) => void;
  onDeletePage: (id: string) => void;
}) {
  return (
    <aside className="w-[220px] shrink-0 py-5 border-r border-brand-border bg-brand-white overflow-y-auto">
      <button onClick={onShowOverview}
        className="w-full text-left px-4 py-2.5 border-none mb-3 flex items-center gap-2 cursor-pointer"
        style={{
          background: showOverview ? "#f7f7f8" : "transparent",
          borderLeft: `3px solid ${showOverview ? "#e40046" : "transparent"}`,
        }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="shrink-0 opacity-50">
          <rect x="1" y="1" width="12" height="3" rx="1" stroke="#151515" strokeWidth="1.4"/>
          <rect x="1" y="6" width="8" height="3" rx="1" stroke="#151515" strokeWidth="1.4"/>
          <rect x="1" y="11" width="5" height="2" rx="1" stroke="#151515" strokeWidth="1.4"/>
        </svg>
        <span className="text-[13px] font-semibold text-brand-ink">Summary</span>
      </button>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-muted px-4 mb-2">Pages</p>
      {pages.map((p: Page) => (
        <div key={p.id} className="group relative flex items-stretch">
          <button onClick={() => onSelectPage(p.id)}
            className="flex-1 text-left px-4 py-2.5 border-none cursor-pointer flex flex-col gap-0.5 pr-7"
            style={{
              background: p.id === activePageId ? "#f7f7f8" : "transparent",
              borderLeft: `3px solid ${p.id === activePageId ? "#e40046" : "transparent"}`,
            }}>
            <span className="text-[13px] font-semibold text-brand-ink">{p.name}</span>
            <div className="flex gap-1.5 items-center">
              <span className="text-xs text-brand-muted">{p.device === "desktop" ? "🖥" : "📱"} {p.device}</span>
              {p.annotations.length > 0 && (
                <span className="text-[11px] bg-brand-red text-brand-white rounded-[10px] px-1.5 font-bold">{p.annotations.length}</span>
              )}
            </div>
          </button>
          {!readonly && (
            <button onClick={e => { e.stopPropagation(); onDeletePage(p.id); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-base text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1.5 py-1 leading-none"
              title="Delete page">×</button>
          )}
        </div>
      ))}
    </aside>
  );
}
