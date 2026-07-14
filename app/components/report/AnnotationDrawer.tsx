"use client";
import { useState } from "react";
import { CAT, SEV, LBL_CLASS, FIELD_CLASS } from "../../lib/theme";
import type { Annotation, Category, Severity } from "../../lib/types";

// ─── ANNOTATION DRAWER (overlay, for creating / editing a single annotation) ──
export function AnnotationDrawer({
  annotation, pageAnnotations, onSave, onDelete, onClose, isNew, readonly, reportId, pageId,
}: {
  annotation: Annotation; pageAnnotations: Annotation[]; onSave: (a: Annotation) => void;
  onDelete: (id: string) => void; onClose: () => void; isNew: boolean;
  readonly: boolean; reportId: string; pageId: string;
}) {
  const [form, setForm] = useState({
    category: annotation.category || "UX",
    severity: annotation.severity || "High",
    title: annotation.title || "",
    detail: annotation.detail || "",
    recommendation: annotation.recommendation || "",
    hypothesis: annotation.hypothesis || "",
  });
  const [clientNotes, setClientNotes] = useState(annotation.clientNotes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const num = pageAnnotations.find(a => a.id === annotation.id)?.number ?? annotation.number;

  function save() {
    if (!form.title.trim()) return;
    onSave({ ...annotation, ...form, clientNotes });
  }

  async function saveClientNotes() {
    setNotesSaving(true);
    try {
      await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, annotationId: annotation.id, clientNotes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex">
      <div onClick={onClose} className="flex-1 bg-black/45" />
      <div className="w-[440px] h-full bg-brand-white overflow-auto animate-[slideIn_0.2s_ease] shadow-[-4px_0_32px_rgba(0,0,0,0.18)] flex flex-col">

        <div className="px-4 h-14 flex items-center justify-between border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[13px] font-extrabold"
              style={{ background: SEV[form.severity as Severity]?.color || "#e40046", color: SEV[form.severity as Severity]?.pinText || "#ffffff" }}
            >{num}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-ink leading-tight">
                {isNew ? "New Finding" : form.title || "Untitled finding"}
              </p>
              <p className="text-xs text-brand-muted mt-0.5">
                {!readonly && (isNew ? "Manual" : annotation.source === "ai" ? "AI Finding" : "Manual Finding")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-brand-muted cursor-pointer text-[22px] leading-none px-2 py-1 shrink-0">×</button>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-5">
          {readonly ? (
            <>
              <div className="flex gap-2 items-center flex-wrap">
                <span
                  className="text-[11px] font-bold px-[7px] py-0.5 rounded uppercase tracking-[0.04em]"
                  style={{ background: CAT[annotation.category]?.accent || "#eee", color: CAT[annotation.category]?.text || "#151515" }}
                >{CAT[annotation.category]?.label || annotation.category}</span>
                <span className="text-xs font-bold" style={{ color: SEV[annotation.severity]?.text || "#767676" }}>{annotation.severity}</span>
              </div>
              <div><label className={LBL_CLASS}>Finding</label><p className={`${FIELD_CLASS} border border-brand-border`}>{annotation.title}</p></div>
              {annotation.detail && <div><label className={LBL_CLASS}>Observed</label><p className={`${FIELD_CLASS} border border-brand-border`}>{annotation.detail}</p></div>}
              {annotation.recommendation && <div><label className={LBL_CLASS}>Recommendation</label><p className={`${FIELD_CLASS} border border-brand-border`}>{annotation.recommendation}</p></div>}
              {annotation.hypothesis && <div><label className={LBL_CLASS}>Hypothesis / user story</label><p className={`${FIELD_CLASS} border border-brand-border`}>{annotation.hypothesis}</p></div>}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={LBL_CLASS}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                    className={`${FIELD_CLASS} cursor-pointer`}
                    style={{ border: `1.5px solid ${CAT[form.category as Category]?.color || "#e8e8e8"}` }}>
                    {Object.keys(CAT).map(c => <option key={c} value={c}>{CAT[c as Category].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL_CLASS}>Importance</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as Severity }))}
                    className={`${FIELD_CLASS} cursor-pointer`}
                    style={{ border: `1.5px solid ${SEV[form.severity as Severity]?.color || "#e8e8e8"}`, color: SEV[form.severity as Severity]?.text || "#151515" }}>
                    {Object.keys(SEV).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LBL_CLASS}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Short description of the issue" className={FIELD_CLASS} />
              </div>
              <div>
                <label className={LBL_CLASS}>Observed</label>
                <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="What did you observe?" rows={3} className={`${FIELD_CLASS} resize-y`} />
              </div>
              <div>
                <label className={LBL_CLASS}>Recommendation</label>
                <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} placeholder="What should be done?" rows={3} className={`${FIELD_CLASS} resize-y`} />
              </div>
              <div>
                <label className={LBL_CLASS}>Hypothesis / user story</label>
                <textarea value={form.hypothesis} disabled placeholder="Auto-generated by AI — not yet available for manual findings" rows={3}
                  className={`${FIELD_CLASS} resize-y bg-[#f0f0f0] text-brand-muted cursor-not-allowed`} />
              </div>
            </>
          )}

          <div className="border-t border-brand-border pt-5">
            <label className={LBL_CLASS}>Client notes</label>
            <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Add notes or feedback here…" rows={3}
              className={`${FIELD_CLASS} resize-y`}
              style={{ background: readonly ? "#fffbe6" : "#f7f7f8", border: `1.5px solid ${readonly ? "#f0d060" : "#e8e8e8"}` }} />
            {readonly && (
              <button onClick={saveClientNotes} disabled={notesSaving}
                className="mt-2.5 text-brand-white border-none rounded-lg px-5 py-2.5 font-bold text-[13px] cursor-pointer transition-colors duration-200"
                style={{ background: notesSaved ? "#00c48c" : "#151515" }}>
                {notesSaved ? "✓ Saved" : notesSaving ? "Saving…" : "Save notes"}
              </button>
            )}
          </div>
        </div>

        {!readonly && (
          <div className="px-6 py-4 border-t border-brand-border flex gap-2.5 shrink-0">
            <button onClick={save} disabled={!form.title.trim()}
              className="flex-1 bg-brand-red text-brand-white border-none rounded-lg p-3 font-extrabold text-sm"
              style={{ cursor: form.title.trim() ? "pointer" : "not-allowed", opacity: form.title.trim() ? 1 : 0.5 }}>
              Save finding
            </button>
            {!isNew && (
              <button onClick={() => onDelete(annotation.id)}
                className="bg-brand-off-white text-brand-red border-[1.5px] border-brand-border rounded-lg px-[18px] py-3 font-bold text-sm cursor-pointer">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
