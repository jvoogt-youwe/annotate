import { useRef } from "react";
import { YouweLogo } from "../YouweLogo";
import type { Report } from "../../lib/types";

// ─── HEADER ───────────────────────────────────────────────────────────────────
export function ReportHeader({
  report, readonly, saving, copied, editingTitle, titleInput,
  onStartEditTitle, onTitleChange, onTitleBlur, onTitleKeyDown,
  onAddPage, onCopyShareLink, onExport, onSignOut,
}: {
  report: Report;
  readonly: boolean;
  saving: boolean;
  copied: boolean;
  editingTitle: boolean;
  titleInput: string;
  onStartEditTitle: () => void;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddPage: () => void;
  onCopyShareLink: () => void;
  onExport: () => void;
  onSignOut: () => void;
}) {
  const titleRef = useRef<HTMLParagraphElement>(null);

  return (
    <header className="bg-brand-ink border-b-2 border-brand-red shrink-0 z-50">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-4">
          <a href="/" className="no-underline"><YouweLogo height={38} /></a>
          <div className="w-px h-7 bg-brand-ink-mid" />
          <div>
            {!readonly && editingTitle ? (
              <input
                autoFocus
                value={titleInput}
                onChange={e => onTitleChange(e.target.value)}
                onBlur={onTitleBlur}
                onKeyDown={onTitleKeyDown}
                className="text-base font-extrabold text-brand-white bg-brand-ink-mid border-none border-b-[1.5px] border-brand-red outline-none tracking-[-0.01em] w-[240px] py-0.5"
              />
            ) : (
              <div onClick={() => { if (!readonly) onStartEditTitle(); }}
                onMouseEnter={() => { if (!readonly && titleRef.current) titleRef.current.style.textDecoration = "underline"; }}
                onMouseLeave={() => { if (!readonly && titleRef.current) titleRef.current.style.textDecoration = "none"; }}
                className="flex items-center gap-1.5"
                style={{ cursor: readonly ? "default" : "text" }}>
                <p ref={titleRef} className="text-base font-extrabold text-brand-white tracking-[-0.01em]">{report.siteName}</p>
                {!readonly && (
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="shrink-0 opacity-50">
                    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5zM8.5 3.5l2 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            )}
            <p className="text-xs text-brand-muted">{report.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-brand-muted">Saving…</span>}
          {!readonly && (
            <button onClick={onAddPage} className="bg-transparent border-[1.5px] border-[#333] text-brand-muted rounded-lg px-3.5 py-2 font-semibold text-[13px] cursor-pointer">
              + Add page
            </button>
          )}
          <button onClick={onCopyShareLink}
            className="text-brand-white border-none rounded-lg px-4 py-2 font-bold text-[13px] cursor-pointer transition-colors duration-200"
            style={{ background: copied ? "#00c48c" : "#1e1e1e" }}>
            {copied ? "✓ Copied" : "Share link"}
          </button>
          <button onClick={onExport} className="bg-brand-red text-brand-white border-none rounded-lg px-4 py-2 font-bold text-[13px] cursor-pointer">
            ↓ Export
          </button>
          {!readonly && (
            <button onClick={onSignOut} className="text-[13px] text-brand-muted bg-transparent border-none cursor-pointer ml-1">
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
