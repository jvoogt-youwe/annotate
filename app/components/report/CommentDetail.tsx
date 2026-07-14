"use client";
import { useRef, useState } from "react";
import { CAT, SEV, DETAIL_W, LBL_CLASS, FIELD_CLASS, genId } from "../../lib/theme";
import type { Annotation, Attachment, Category, Page, Severity } from "../../lib/types";

// ─── COMMENT DETAIL (side panel, editable annotation view — shared by both the ──
// ─── "Annotations" list selection and clicking a pin directly on the screenshot) ──
export function CommentDetail({ annotation, page, onClose, onSave, onDelete, readonly, reportId, password, onClientNotesSaved, isNew }: {
  annotation: Annotation; page: Page | null | undefined; onClose: () => void;
  onSave: (a: Annotation) => void; onDelete: (id: string) => void;
  readonly: boolean; reportId: string; password: string | null;
  onClientNotesSaved: (annotationId: string, notes: string) => void;
  isNew?: boolean;
}) {
  const [form, setForm] = useState({
    category: annotation.category || "UX",
    severity: annotation.severity || "High",
    title: annotation.title || "",
    detail: annotation.detail || "",
    recommendation: annotation.recommendation || "",
    hypothesis: annotation.hypothesis || "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>(annotation.attachments || []);
  const [clientNotes, setClientNotes] = useState(annotation.clientNotes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    if (!form.title.trim()) return;
    onSave({ ...annotation, ...form, clientNotes, attachments });
  }

  async function handleImageUpload(file: File) {
    if (!password) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { "x-audit-password": password }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttachments(prev => [...prev, { id: genId(), type: "image", url: data.url }]);
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    setAttachments(prev => [...prev, { id: genId(), type: "link", url }]);
    setLinkUrl("");
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  async function saveClientNotes() {
    setNotesSaving(true);
    try {
      await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page?.id, annotationId: annotation.id, clientNotes }),
      });
      onClientNotesSaved(annotation.id, clientNotes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setNotesSaving(false);
    }
  }

  const fieldBlockClass = "text-sm text-brand-ink leading-relaxed bg-brand-off-white rounded-lg px-3.5 py-3 border border-brand-border";
  const imageAttachments = attachments.filter(a => a.type === "image");
  const linkAttachments = attachments.filter(a => a.type === "link");

  return (
    <div style={{ width: DETAIL_W }} className="h-full flex flex-col bg-brand-white border-l border-brand-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-brand-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[13px] font-extrabold" style={{ background: SEV[form.severity as Severity]?.color || "#e40046", color: SEV[form.severity as Severity]?.pinText || "#ffffff" }}>
            {annotation.number}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-ink leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
              {isNew ? "New Finding" : form.title || "Untitled finding"}
            </p>
            {!readonly && <p className="text-xs text-brand-muted mt-0.5">{isNew ? "Manual" : annotation.source === "ai" ? "AI Finding" : "Manual Finding"}</p>}
          </div>
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-brand-muted cursor-pointer text-[22px] leading-none px-2 py-1 shrink-0">×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-[18px]">
        {readonly ? (
          // ── Read-only view for clients ──
          <>
            <div className="flex gap-2 items-center flex-wrap">
              <span
                className="text-[11px] font-bold px-[7px] py-0.5 rounded uppercase tracking-[0.04em]"
                style={{ background: CAT[annotation.category]?.accent || "#eee", color: CAT[annotation.category]?.text || "#151515" }}>
                {CAT[annotation.category]?.label || annotation.category}
              </span>
              <span className="text-xs font-bold" style={{ color: SEV[annotation.severity]?.text || "#767676" }}>{annotation.severity}</span>
            </div>
            <p className="text-[15px] font-bold text-brand-ink leading-normal">{annotation.title}</p>
            {annotation.detail && <div><label className={LBL_CLASS}>Observed</label><p className={fieldBlockClass}>{annotation.detail}</p></div>}
            {annotation.recommendation && <div><label className={LBL_CLASS}>Recommendation</label><p className={fieldBlockClass}>{annotation.recommendation}</p></div>}
            {annotation.hypothesis && <div><label className={LBL_CLASS}>Hypothesis / user story</label><p className={fieldBlockClass}>{annotation.hypothesis}</p></div>}
          </>
        ) : (
          // ── Editable form ──
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
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Short description of the issue" className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LBL_CLASS}>Observed</label>
              <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                placeholder="What did you observe?" rows={3} className={`${FIELD_CLASS} resize-y`} />
            </div>
            <div>
              <label className={LBL_CLASS}>Recommendation</label>
              <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                placeholder="What should be done?" rows={3} className={`${FIELD_CLASS} resize-y`} />
            </div>
            <div>
              <label className={LBL_CLASS}>Hypothesis / user story</label>
              <textarea value={form.hypothesis} disabled placeholder="Auto-generated by AI — not yet available for manual findings" rows={3}
                className={`${FIELD_CLASS} resize-y bg-[#f0f0f0] text-brand-muted cursor-not-allowed`} />
            </div>
          </>
        )}

        {/* Attachments (images) — always present */}
        {(imageAttachments.length > 0 || !readonly) && (
          <div className="border-t border-brand-border pt-[18px]">
            <label className={LBL_CLASS}>Attachments</label>
            {imageAttachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-2.5">
                {imageAttachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 bg-brand-off-white rounded-lg px-3 py-2 border border-brand-border">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={a.url} alt="Attachment" className="w-10 h-10 object-cover rounded-md border border-brand-border" />
                    </a>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-brand-blue no-underline overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                      View image
                    </a>
                    {!readonly && (
                      <button onClick={() => removeAttachment(a.id)}
                        className="bg-transparent border-none text-brand-muted cursor-pointer text-base leading-none shrink-0">×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!readonly && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
                <div
                  onClick={() => !uploading && password && fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); if (password && !uploading) setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && password && !uploading) handleImageUpload(f);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150"
                  style={{
                    borderColor: dragOver ? "#e40046" : "#d8d8dc",
                    background: dragOver ? "#e4004610" : "#f7f7f8",
                    cursor: password && !uploading ? "pointer" : "not-allowed",
                    opacity: password ? 1 : 0.6,
                  }}>
                  <span className="text-lg leading-none text-brand-muted">↑</span>
                  {uploading ? (
                    <span className="text-[13px] font-bold text-brand-ink">Uploading…</span>
                  ) : (
                    <>
                      <span className="text-[13px] font-bold text-brand-ink">Drag and drop here</span>
                      <span className="text-xs text-brand-muted">or <span className="text-brand-blue font-bold">browse files</span></span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Links (reference section) — always present */}
        {(linkAttachments.length > 0 || !readonly) && (
          <div className="border-t border-brand-border pt-[18px]">
            <label className={LBL_CLASS}>Links</label>
            {linkAttachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-2.5">
                {linkAttachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 bg-brand-off-white rounded-lg px-3 py-2 border border-brand-border">
                    <span className="shrink-0 text-brand-muted text-sm">🔗</span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-brand-blue no-underline overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                      {a.label || a.url}
                    </a>
                    {!readonly && (
                      <button onClick={() => removeAttachment(a.id)}
                        className="bg-transparent border-none text-brand-muted cursor-pointer text-base leading-none shrink-0">×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!readonly && (
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                className={FIELD_CLASS}
                onKeyDown={e => { if (e.key === "Enter") addLink(); }}
                onBlur={() => { if (linkUrl.trim()) addLink(); }} />
            )}
          </div>
        )}

        {/* Client notes — always present */}
        <div className="border-t border-brand-border pt-[18px]">
          <label className={LBL_CLASS}>Client notes</label>
          <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
            placeholder="Add notes or feedback here…" rows={3}
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

      {/* Footer — edit mode only */}
      {!readonly && (
        <div className="px-4 py-3.5 border-t border-brand-border flex gap-2.5 shrink-0">
          <button onClick={save} disabled={!form.title.trim()}
            className="flex-1 bg-brand-red text-brand-white border-none rounded-lg p-[11px] font-extrabold text-sm"
            style={{ cursor: form.title.trim() ? "pointer" : "not-allowed", opacity: form.title.trim() ? 1 : 0.5 }}>
            Save finding
          </button>
          {!isNew && (
            <button onClick={() => onDelete(annotation.id)}
              className="bg-brand-off-white text-brand-red border-[1.5px] border-brand-border rounded-lg px-4 py-[11px] font-bold text-sm cursor-pointer">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
