// ─── BOTTOM TOOLBAR ───────────────────────────────────────────────────────────
export function BottomToolbar({ annotationCount, commentsOpen, onToggleComments }: {
  annotationCount: number; commentsOpen: boolean; onToggleComments: () => void;
}) {
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-0.5 rounded-full p-[5px_6px] transition-colors duration-150 whitespace-nowrap"
      style={{
        background: commentsOpen ? "#e40046" : "#151515",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)",
      }}>
      <button onClick={onToggleComments}
        className="border-none rounded-[80px] px-4 py-2 cursor-pointer flex items-center gap-2 text-[13px] font-bold transition-colors duration-150"
        style={{
          background: commentsOpen ? "#e40046" : "transparent",
          color: commentsOpen ? "#ffffff" : "#9a9a9a",
        }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        </svg>
        Comments
        {annotationCount > 0 && (
          <span
            className="text-brand-white rounded-[10px] px-[7px] text-[11px] font-extrabold leading-[18px]"
            style={{ background: commentsOpen ? "rgba(255,255,255,0.25)" : "#e40046" }}>
            {annotationCount}
          </span>
        )}
      </button>
    </div>
  );
}
