"use client";
import { useRef, useState } from "react";
import { CAT, SEV, genId } from "../../lib/theme";
import type { Annotation, Page } from "../../lib/types";
import { AnnotationDrawer } from "./AnnotationDrawer";

// ─── ANNOTATED SCREENSHOT ─────────────────────────────────────────────────────
export function AnnotatedScreenshot({
  page, onUpdate, password, readonly, reportId, highlightedAnnotationId,
}: {
  page: Page; onUpdate: (p: Page) => void; password: string | null;
  readonly: boolean; reportId: string; highlightedAnnotationId: string | null;
}) {
  const [drawerAnnotation, setDrawerAnnotation] = useState<Annotation | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function getRelativePos(e: React.MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (readonly || dragMoved) return;
    const { x, y } = getRelativePos(e);
    const newAnnotation: Annotation = { id: genId(), number: page.annotations.length + 1, x, y, category: "UX", severity: "High", title: "", detail: "", recommendation: "", hypothesis: "", source: "manual" };
    setDrawerAnnotation(newAnnotation);
    setIsNew(true);
  }

  function handleContainerMouseMove(e: React.MouseEvent) {
    if (!draggingId || readonly) return;
    setDragMoved(true);
    const { x, y } = getRelativePos(e);
    onUpdate({ ...page, annotations: page.annotations.map((a: Annotation) => a.id === draggingId ? { ...a, x, y } : a) });
  }

  function handleContainerMouseUp() { setDraggingId(null); }

  function saveAnnotation(updated: Annotation) {
    const annotations = [...page.annotations];
    const idx = annotations.findIndex(a => a.id === updated.id);
    if (idx === -1) annotations.push({ ...updated, number: annotations.length + 1 });
    else annotations[idx] = updated;
    onUpdate({ ...page, annotations });
    setDrawerAnnotation(null);
  }

  function deleteAnnotation(id: string) {
    onUpdate({ ...page, annotations: page.annotations.filter((a: Annotation) => a.id !== id).map((a: Annotation, i: number) => ({ ...a, number: i + 1 })) });
    setDrawerAnnotation(null);
  }

  async function generateAI() {
    if (!password) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-findings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ screenshotUrl: page.screenshotUrl, pageName: page.name, device: page.device }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const existing = page.annotations.length;
      onUpdate({ ...page, annotations: [...page.annotations, ...data.annotations.map((a: Annotation, i: number) => ({ ...a, number: existing + i + 1 }))] });
    } catch (e: any) {
      alert("AI analysis failed: " + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!password) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { "x-audit-password": password }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...page, screenshotUrl: data.url, annotations: [] });
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {!readonly && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <button onClick={generateAI} disabled={aiLoading || !page.screenshotUrl}
            className="bg-brand-ink text-brand-white border-none rounded-lg px-[18px] py-[9px] font-bold text-[13px] flex items-center gap-2"
            style={{ cursor: aiLoading ? "not-allowed" : "pointer", opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? <><div className="w-[13px] h-[13px] rounded-full border-2 border-[#444] border-t-brand-red animate-spin" />Analysing…</> : "✦ Generate AI findings"}
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-brand-white text-brand-ink border-[1.5px] border-brand-border rounded-lg px-[18px] py-[9px] font-bold text-[13px] cursor-pointer">
            {uploading ? "Uploading…" : "↑ Replace screenshot"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <span className="text-[13px] text-brand-muted">Click the screenshot to add a pin</span>
        </div>
      )}

      <div ref={containerRef}
        className="relative select-none rounded-lg overflow-hidden border border-brand-border bg-[#eee]"
        style={{
          cursor: draggingId ? "grabbing" : readonly ? "default" : "crosshair",
          maxWidth: page.device === "mobile" ? 390 : undefined,
          margin: page.device === "mobile" ? "0 auto" : undefined,
        }}
        onClick={handleContainerClick}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}>
        {page.screenshotUrl
          ? <img src={page.screenshotUrl} alt={`${page.name} ${page.device}`} className="w-full block pointer-events-none" />
          : <div className="h-[300px] flex items-center justify-center"><p className="text-brand-muted text-sm">No screenshot available</p></div>
        }
        {page.annotations.map((a: Annotation) => (
          <div key={a.id}
            title={draggingId ? undefined : a.title}
            onMouseDown={e => { if (readonly) return; e.stopPropagation(); setDragMoved(false); setDraggingId(a.id); }}
            onClick={e => { e.stopPropagation(); if (!dragMoved) { setDrawerAnnotation(a); setIsNew(false); } }}
            className="absolute w-[30px] h-[30px] rounded-full text-brand-white border-[2.5px] border-white text-[13px] font-extrabold flex items-center justify-center leading-none select-none transition-[transform,box-shadow] duration-[180ms]"
            style={{
              left: `${a.x}%`, top: `${a.y}%`,
              transform: highlightedAnnotationId === a.id ? "translate(-50%,-50%) scale(1.3)" : "translate(-50%,-50%)",
              background: SEV[a.severity]?.color || "#e40046",
              boxShadow: highlightedAnnotationId === a.id
                ? `0 0 0 4px white, 0 0 0 8px ${SEV[a.severity]?.color || "#e40046"}`
                : "0 2px 8px rgba(0,0,0,0.3)",
              cursor: readonly ? "default" : draggingId === a.id ? "grabbing" : "grab",
              zIndex: highlightedAnnotationId === a.id ? 20 : 10,
            }}>
            {a.number}
          </div>
        ))}
      </div>

      {page.annotations.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {page.annotations.map((a: Annotation) => (
            <button key={a.id} onClick={() => { setDrawerAnnotation(a); setIsNew(false); }}
              className="bg-brand-white border border-brand-border rounded-lg px-4 py-3 cursor-pointer text-left flex items-center gap-3">
              <div className="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold text-brand-white" style={{ background: SEV[a.severity]?.color || "#e40046" }}>{a.number}</div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.05em] mr-2" style={{ color: CAT[a.category]?.color }}>{CAT[a.category]?.label || a.category}</span>
                <span className="text-sm font-semibold text-brand-ink">{a.title}</span>
              </div>
              <span className="text-xs text-brand-muted shrink-0">{a.severity}</span>
            </button>
          ))}
        </div>
      )}

      {drawerAnnotation && (
        <AnnotationDrawer
          annotation={drawerAnnotation}
          pageAnnotations={page.annotations}
          onSave={saveAnnotation}
          onDelete={deleteAnnotation}
          onClose={() => setDrawerAnnotation(null)}
          isNew={isNew}
          readonly={readonly}
          reportId={reportId}
          pageId={page.id}
        />
      )}
    </div>
  );
}
