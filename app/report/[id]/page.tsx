"use client";
import { useState, useEffect, useRef } from "react";
import { use } from "react";

const B = {
  red: "#e40046", ink: "#151515", inkMid: "#2a2a2a",
  white: "#ffffff", offWhite: "#f7f7f8", muted: "#9a9a9a",
  border: "#e8e8e8", blue: "#76B4FD",
};

const CAT: Record<string, { color: string; accent: string; label: string }> = {
  UX:   { color: "#e40046", accent: "#e4004615", label: "UX" },
  A11y: { color: "#76B4FD", accent: "#76B4FD15", label: "Accessibility" },
  CRO:  { color: "#00c48c", accent: "#00c48c15", label: "CRO" },
  Perf: { color: "#f5a623", accent: "#f5a62315", label: "Performance" },
  Idea: { color: "#8b5cf6", accent: "#8b5cf615", label: "Idea" },
};

const SEV: Record<string, { color: string; bg: string }> = {
  Critical: { color: "#e40046", bg: "#e4004618" },
  High:     { color: "#f5a623", bg: "#f5a62318" },
  Medium:   { color: "#76B4FD", bg: "#76B4FD18" },
  Low:      { color: "#9a9a9a", bg: "#9a9a9a18" },
};

const LIST_W = 280;
const DETAIL_W = 360;

const LBL: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.07em",
  display: "block", marginBottom: 7,
};

function genId() { return Math.random().toString(36).slice(2, 9); }
function YouweLogo({ height = 36 }: { height?: number }) {
  return <img src="/youwe-logo.svg" height={height} alt="Youwe" />;
}

// ─── ANNOTATION DRAWER (overlay, for creating / editing a single annotation) ──
function AnnotationDrawer({
  annotation, pageAnnotations, onSave, onDelete, onClose, isNew, readonly, reportId, pageId,
}: {
  annotation: any; pageAnnotations: any[]; onSave: (a: any) => void;
  onDelete: (id: string) => void; onClose: () => void; isNew: boolean;
  readonly: boolean; reportId: string; pageId: string;
}) {
  const [form, setForm] = useState({
    category: annotation.category || "UX",
    severity: annotation.severity || "High",
    title: annotation.title || "",
    detail: annotation.detail || "",
    recommendation: annotation.recommendation || "",
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

  const field: React.CSSProperties = {
    width: "100%", background: B.offWhite,
    border: `1.5px solid ${B.border}`, borderRadius: 8,
    padding: "10px 14px", fontSize: 13, fontWeight: 400, fontFamily: "Arial, sans-serif", color: "#151515", lineHeight: 1.5,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.45)" }} />
      <div style={{ width: 440, background: B.white, height: "100%", overflow: "auto", animation: "slideIn 0.2s ease", boxShadow: "-4px 0 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>

        <div style={{ padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${B.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: SEV[form.severity]?.color || B.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: B.white }}>{num}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: B.ink, lineHeight: 1.2 }}>
                {isNew ? "New Finding" : form.title || "Untitled finding"}
              </p>
              <p style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>
                {!readonly && (isNew ? "Manual" : annotation.source === "ai" ? "AI Finding" : "Manual Finding")}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: B.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px", flexShrink: 0 }}>×</button>
        </div>

        <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {readonly ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: CAT[annotation.category]?.accent || "#eee", color: CAT[annotation.category]?.color || B.ink, textTransform: "uppercase", letterSpacing: "0.04em" }}>{CAT[annotation.category]?.label || annotation.category}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: SEV[annotation.severity]?.color || B.muted }}>{annotation.severity}</span>
              </div>
              <div><label style={LBL}>Finding</label><p style={{ ...field, border: `1px solid ${B.border}` }}>{annotation.title}</p></div>
              {annotation.detail && <div><label style={LBL}>Observed</label><p style={{ ...field, border: `1px solid ${B.border}` }}>{annotation.detail}</p></div>}
              {annotation.recommendation && <div><label style={LBL}>Recommendation</label><p style={{ ...field, border: `1px solid ${B.border}` }}>{annotation.recommendation}</p></div>}
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LBL}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ ...field, border: `1.5px solid ${CAT[form.category]?.color || B.border}`, cursor: "pointer" }}>
                    {Object.keys(CAT).map(c => <option key={c} value={c}>{CAT[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Importance</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    style={{ ...field, border: `1.5px solid ${SEV[form.severity]?.color || B.border}`, color: SEV[form.severity]?.color || B.ink, cursor: "pointer" }}>
                    {Object.keys(SEV).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={LBL}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Short description of the issue" style={field} />
              </div>
              <div>
                <label style={LBL}>Observed</label>
                <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="What did you observe?" rows={3} style={{ ...field, resize: "vertical" }} />
              </div>
              <div>
                <label style={LBL}>Recommendation</label>
                <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} placeholder="What should be done?" rows={3} style={{ ...field, resize: "vertical" }} />
              </div>
            </>
          )}

          <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 20 }}>
            <label style={LBL}>Client notes</label>
            <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Add notes or feedback here…" rows={3}
              style={{ ...field, background: readonly ? "#fffbe6" : B.offWhite, border: `1.5px solid ${readonly ? "#f0d060" : B.border}`, resize: "vertical" }} />
            {readonly && (
              <button onClick={saveClientNotes} disabled={notesSaving}
                style={{ marginTop: 10, background: notesSaved ? "#00c48c" : B.ink, color: B.white, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}>
                {notesSaved ? "✓ Saved" : notesSaving ? "Saving…" : "Save notes"}
              </button>
            )}
          </div>
        </div>

        {!readonly && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${B.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={save} disabled={!form.title.trim()}
              style={{ flex: 1, background: B.red, color: B.white, border: "none", borderRadius: 8, padding: "12px", fontWeight: 800, fontSize: 14, cursor: form.title.trim() ? "pointer" : "not-allowed", opacity: form.title.trim() ? 1 : 0.5 }}>
              Save finding
            </button>
            {!isNew && (
              <button onClick={() => onDelete(annotation.id)}
                style={{ background: B.offWhite, color: B.red, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "12px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ANNOTATED SCREENSHOT ─────────────────────────────────────────────────────
function AnnotatedScreenshot({
  page, onUpdate, password, readonly, reportId, highlightedAnnotationId,
}: {
  page: any; onUpdate: (p: any) => void; password: string | null;
  readonly: boolean; reportId: string; highlightedAnnotationId: string | null;
}) {
  const [drawerAnnotation, setDrawerAnnotation] = useState<any | null>(null);
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
    const newAnnotation = { id: genId(), number: page.annotations.length + 1, x, y, category: "UX", severity: "High", title: "", detail: "", recommendation: "", source: "manual" };
    setDrawerAnnotation(newAnnotation);
    setIsNew(true);
  }

  function handleContainerMouseMove(e: React.MouseEvent) {
    if (!draggingId || readonly) return;
    setDragMoved(true);
    const { x, y } = getRelativePos(e);
    onUpdate({ ...page, annotations: page.annotations.map((a: any) => a.id === draggingId ? { ...a, x, y } : a) });
  }

  function handleContainerMouseUp() { setDraggingId(null); }

  function saveAnnotation(updated: any) {
    const annotations = [...page.annotations];
    const idx = annotations.findIndex(a => a.id === updated.id);
    if (idx === -1) annotations.push({ ...updated, number: annotations.length + 1 });
    else annotations[idx] = updated;
    onUpdate({ ...page, annotations });
    setDrawerAnnotation(null);
  }

  function deleteAnnotation(id: string) {
    onUpdate({ ...page, annotations: page.annotations.filter((a: any) => a.id !== id).map((a: any, i: number) => ({ ...a, number: i + 1 })) });
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
      onUpdate({ ...page, annotations: [...page.annotations, ...data.annotations.map((a: any, i: number) => ({ ...a, number: existing + i + 1 }))] });
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
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={generateAI} disabled={aiLoading || !page.screenshotUrl}
            style={{ background: B.ink, color: B.white, border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? <><div style={{ width: 13, height: 13, border: `2px solid #444`, borderTop: `2px solid ${B.red}`, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />Analysing…</> : "✦ Generate AI findings"}
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: B.white, color: B.ink, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {uploading ? "Uploading…" : "↑ Replace screenshot"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <span style={{ fontSize: 13, color: B.muted }}>Click the screenshot to add a pin</span>
        </div>
      )}

      <div ref={containerRef}
        style={{ position: "relative", cursor: draggingId ? "grabbing" : readonly ? "default" : "crosshair", userSelect: "none", borderRadius: 8, overflow: "hidden", border: `1px solid ${B.border}`, background: "#eee", maxWidth: page.device === "mobile" ? 390 : undefined, margin: page.device === "mobile" ? "0 auto" : undefined }}
        onClick={handleContainerClick}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}>
        {page.screenshotUrl
          ? <img src={page.screenshotUrl} alt={`${page.name} ${page.device}`} style={{ width: "100%", display: "block", pointerEvents: "none" }} />
          : <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: B.muted, fontSize: 14 }}>No screenshot available</p></div>
        }
        {page.annotations.map((a: any) => (
          <div key={a.id}
            title={draggingId ? undefined : a.title}
            onMouseDown={e => { if (readonly) return; e.stopPropagation(); setDragMoved(false); setDraggingId(a.id); }}
            onClick={e => { e.stopPropagation(); if (!dragMoved) { setDrawerAnnotation(a); setIsNew(false); } }}
            style={{
              position: "absolute", left: `${a.x}%`, top: `${a.y}%`,
              transform: highlightedAnnotationId === a.id ? "translate(-50%,-50%) scale(1.3)" : "translate(-50%,-50%)",
              width: 30, height: 30, borderRadius: "50%",
              background: SEV[a.severity]?.color || B.red,
              color: B.white, border: "2.5px solid white",
              boxShadow: highlightedAnnotationId === a.id
                ? `0 0 0 4px white, 0 0 0 8px ${SEV[a.severity]?.color || B.red}`
                : "0 2px 8px rgba(0,0,0,0.3)",
              fontSize: 13, fontWeight: 800,
              cursor: readonly ? "default" : draggingId === a.id ? "grabbing" : "grab",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: highlightedAnnotationId === a.id ? 20 : 10,
              lineHeight: 1, userSelect: "none",
              transition: "transform 0.18s, box-shadow 0.18s",
            }}>
            {a.number}
          </div>
        ))}
      </div>

      {page.annotations.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {page.annotations.map((a: any) => (
            <button key={a.id} onClick={() => { setDrawerAnnotation(a); setIsNew(false); }}
              style={{ background: B.white, border: `1px solid ${B.border}`, borderRadius: 8, padding: "12px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: SEV[a.severity]?.color || B.red, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: B.white }}>{a.number}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: CAT[a.category]?.color, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 8 }}>{CAT[a.category]?.label || a.category}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: B.ink }}>{a.title}</span>
              </div>
              <span style={{ fontSize: 12, color: B.muted, flexShrink: 0 }}>{a.severity}</span>
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

// ─── HTML EXPORT ──────────────────────────────────────────────────────────────
function generateExportHTML(report: any, shareUrl: string): string {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const totalAnnotations = report.pages.reduce((n: number, p: any) => n + p.annotations.length, 0);
  const ov = report.overview;
  const overviewSection = (ov?.summary || ov?.keyFindings || ov?.urgentFixes) ? `
    <div class="page-section" style="margin-bottom:28px">
      <div class="page-header"><h2>Report Overview</h2></div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
        ${ov.summary ? `<div><p class="ov-label">Summary</p><p class="ov-text">${ov.summary.replace(/\n/g, "<br>")}</p></div>` : ""}
        ${ov.keyFindings ? `<div><p class="ov-label">Key Findings</p><p class="ov-text">${ov.keyFindings.replace(/\n/g, "<br>")}</p></div>` : ""}
        ${ov.urgentFixes ? `<div><p class="ov-label">Urgent Fixes</p><p class="ov-text" style="border-left:3px solid #e40046;padding-left:12px">${ov.urgentFixes.replace(/\n/g, "<br>")}</p></div>` : ""}
      </div>
    </div>` : "";

  const pagesSections = report.pages.map((page: any) => {
    const list = page.annotations.map((a: any) => `
      <div class="finding">
        <div class="finding-num" style="background:${SEV[a.severity]?.color || "#e40046"}">${a.number}</div>
        <div class="finding-body">
          <div class="finding-meta">
            <span class="cat" style="color:${CAT[a.category]?.color};background:${CAT[a.category]?.color}18">${CAT[a.category]?.label || a.category}</span>
            <span class="sev" style="color:${SEV[a.severity]?.color}">${a.severity}</span>
          </div>
          <p class="finding-title">${a.title}</p>
          ${a.detail ? `<p class="finding-detail">${a.detail}</p>` : ""}
          ${a.recommendation ? `<p class="finding-rec"><strong>Recommendation:</strong> ${a.recommendation}</p>` : ""}
          ${a.clientNotes ? `<p class="finding-notes"><strong>Client note:</strong> ${a.clientNotes}</p>` : ""}
        </div>
      </div>`).join("");

    const pins = page.annotations.map((a: any) => `
      <div class="pin" style="left:${a.x}%;top:${a.y}%;background:${SEV[a.severity]?.color || "#e40046"}">${a.number}</div>`).join("");

    return `
      <div class="page-section">
        <div class="page-header">
          <h2>${page.name}</h2>
          <span class="device-badge">${page.device === "desktop" ? "🖥 Desktop" : "📱 Mobile"}</span>
        </div>
        <div class="screenshot-wrap">
          <img src="${page.screenshotUrl}" alt="${page.name}" />
          ${pins}
        </div>
        ${page.annotations.length > 0 ? `<div class="findings-list">${list}</div>` : ""}
      </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>UX Annotation Report — ${report.siteName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f7f7f8;color:#151515}
.page{max-width:1100px;margin:0 auto;padding:40px 32px 80px}
.header{background:#151515;border-radius:16px;padding:36px;margin-bottom:32px}
.meta{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e40046;margin-bottom:8px}
h1{font-size:30px;font-weight:900;color:#fff;letter-spacing:-.02em;margin-bottom:4px}
.url{font-size:14px;color:#76B4FD;display:block;margin-bottom:12px}
.summary-line{font-size:14px;color:#aaa;margin-bottom:6px}
.share{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:16px 24px;margin-bottom:28px}
.page-section{background:#fff;border-radius:12px;border:1px solid #e8e8e8;overflow:hidden;margin-bottom:28px}
.page-header{padding:16px 20px;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:space-between}
.page-header h2{font-size:16px;font-weight:700}
.device-badge{font-size:12px;color:#9a9a9a;background:#f7f7f8;padding:4px 10px;border-radius:20px;border:1px solid #e8e8e8}
.screenshot-wrap{position:relative;border-bottom:1px solid #e8e8e8}
.screenshot-wrap img{width:100%;display:block}
.pin{position:absolute;width:28px;height:28px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.findings-list{padding:20px;display:flex;flex-direction:column;gap:12px}
.finding{display:flex;gap:14px;align-items:flex-start}
.finding-num{width:26px;height:26px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.finding-body{flex:1}
.finding-meta{display:flex;gap:8px;align-items:center;margin-bottom:5px}
.cat{font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
.sev{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.finding-title{font-size:14px;font-weight:600;margin-bottom:5px}
.finding-detail{font-size:13px;color:#555;line-height:1.6;margin-bottom:5px}
.finding-rec{font-size:13px;color:#333;line-height:1.6;margin-bottom:5px}
.finding-notes{font-size:13px;color:#7a6000;background:#fffbe6;border-left:3px solid #f0d060;padding:6px 10px;border-radius:0 6px 6px 0;line-height:1.6}
.footer{margin-top:48px;padding-top:24px;border-top:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.ov-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9a9a9a;margin-bottom:6px}
.ov-text{font-size:14px;color:#333;line-height:1.7}
@media print{body{background:#fff}.page{padding:20px}}
</style></head><body><div class="page">
<div class="header">
  <p class="meta">UX Annotation Report · ${date}</p>
  <h1>${report.siteName}</h1>
  <a class="url" href="${report.url}">${report.url}</a>
  <p class="summary-line">${report.pages.length} pages · ${totalAnnotations} findings</p>
</div>
${shareUrl ? `<div class="share"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9a9a9a;margin-bottom:4px">Live report link</p><p style="font-size:13px;color:#76B4FD;font-family:monospace">${shareUrl}</p></div>` : ""}
${overviewSection}
${pagesSections}
<div class="footer">
  <div style="font-size:18px;font-weight:900;letter-spacing:-.02em">youwe<span style="color:#e40046">.</span></div>
  <div style="font-size:13px;color:#9a9a9a">Confidential · Prepared by Youwe Agency · ${date}</div>
</div>
</div></body></html>`;
}

// ─── PAGE EDITOR ──────────────────────────────────────────────────────────────
function PageEditor({ page, onUpdate, onMetaUpdate, password, readonly, reportId, highlightedAnnotationId }: {
  page: any; onUpdate: (p: any) => void; onMetaUpdate: (name: string, url: string, device: string) => void;
  password: string | null; readonly: boolean; reportId: string; highlightedAnnotationId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(page.name);
  const [url, setUrl] = useState(page.url);
  const [device, setDevice] = useState(page.device || "desktop");

  useEffect(() => { setName(page.name); setUrl(page.url); setDevice(page.device || "desktop"); }, [page.id]);

  function save() {
    if (!name.trim()) return;
    onMetaUpdate(name.trim(), url.trim(), device);
    setEditing(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {editing ? (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Page name"
              style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 700, color: B.ink, width: 200 }} />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, color: B.ink, flex: 1, minWidth: 200 }} />
            <div style={{ position: "relative" }}>
              <select value={device} onChange={e => setDevice(e.target.value)}
                style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "8px 32px 8px 14px", fontSize: 13, color: B.ink, cursor: "pointer", appearance: "none" as any }}>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
              <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <button onClick={save} style={{ background: B.ink, color: B.white, border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
            <button onClick={() => { setEditing(false); setName(page.name); setUrl(page.url); setDevice(page.device || "desktop"); }}
              style={{ background: "none", border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, color: B.muted, cursor: "pointer" }}>Cancel</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 16, fontWeight: 700, color: B.ink }}>{page.name}</span>
            {page.url && <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: B.blue, textDecoration: "none" }}>{page.url}</a>}
            {!readonly && (
              <button onClick={() => setEditing(true)} style={{ background: "none", border: `1px solid ${B.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, color: B.muted, cursor: "pointer" }}>✎ Edit</button>
            )}
          </>
        )}
      </div>
      <AnnotatedScreenshot page={page} onUpdate={onUpdate} password={password} readonly={readonly} reportId={reportId} highlightedAnnotationId={highlightedAnnotationId} />
    </div>
  );
}

// ─── BOTTOM TOOLBAR ───────────────────────────────────────────────────────────
function BottomToolbar({ annotationCount, commentsOpen, onToggleComments }: {
  annotationCount: number; commentsOpen: boolean; onToggleComments: () => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, display: "flex", alignItems: "center", gap: 2,
      background: commentsOpen ? B.red : B.ink, borderRadius: 100, padding: "5px 6px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)",
      transition: "background 0.15s",
      whiteSpace: "nowrap",
    }}>
      <button onClick={onToggleComments} style={{
        background: commentsOpen ? B.red : "transparent",
        border: "none", borderRadius: 80, padding: "8px 16px",
        color: commentsOpen ? B.white : B.muted,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
        fontSize: 13, fontWeight: 700,
        transition: "background 0.15s, color 0.15s",
      }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        </svg>
        Comments
        {annotationCount > 0 && (
          <span style={{ background: commentsOpen ? "rgba(255,255,255,0.25)" : B.red, color: B.white, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800, lineHeight: "18px" }}>
            {annotationCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── COMMENTS LIST (right drawer, compact summaries) ──────────────────────────
function CommentsList({ page, selectedId, onSelect, highlightedId, onHighlight, onClose }: {
  page: any; selectedId: string | null;
  onSelect: (a: any) => void;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  onClose: () => void;
}) {
  const annotations: any[] = page?.annotations || [];

  return (
    <div style={{ width: LIST_W, height: "100%", display: "flex", flexDirection: "column", background: B.white }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56, borderBottom: `1px solid ${B.border}`, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: B.ink, lineHeight: 1.2 }}>Annotations</p>
          <p style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>
            {page?.device === "desktop" ? "🖥" : "📱"} {annotations.length} finding{annotations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: B.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px" }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {annotations.length === 0 ? (
          <p style={{ color: B.muted, fontSize: 14, textAlign: "center", padding: "48px 16px" }}>No annotations yet.</p>
        ) : annotations.map((a: any) => {
          const isSelected = selectedId === a.id;
          const isHL = highlightedId === a.id;
          return (
            <button key={a.id}
              onMouseEnter={() => onHighlight(a.id)}
              onMouseLeave={() => onHighlight(selectedId)}
              onClick={() => { onSelect(a); onHighlight(a.id); }}
              style={{
                width: "100%", textAlign: "left", padding: "12px 16px",
                background: isSelected ? "#f0f4ff" : isHL ? B.offWhite : "transparent",
                border: "none",
                borderLeft: `3px solid ${isSelected ? (SEV[a.severity]?.color || B.red) : "transparent"}`,
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
                transition: "background 0.1s",
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: SEV[a.severity]?.color || B.red,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: B.white,
                transform: isHL ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.12s", marginTop: 1,
              }}>{a.number}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: CAT[a.category]?.accent || "#eee", color: CAT[a.category]?.color || B.ink, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {CAT[a.category]?.label || a.category}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: B.ink, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                  {a.title}
                </p>
                <p style={{ fontSize: 12, color: B.muted, marginTop: 3 }}>{a.severity}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMMENT DETAIL (second panel, editable annotation view) ─────────────────
function CommentDetail({ annotation, page, onClose, onSave, onDelete, readonly, reportId, onClientNotesSaved }: {
  annotation: any; page: any; onClose: () => void;
  onSave: (a: any) => void; onDelete: (id: string) => void;
  readonly: boolean; reportId: string;
  onClientNotesSaved: (annotationId: string, notes: string) => void;
}) {
  const [form, setForm] = useState({
    category: annotation.category || "UX",
    severity: annotation.severity || "High",
    title: annotation.title || "",
    detail: annotation.detail || "",
    recommendation: annotation.recommendation || "",
  });
  const [clientNotes, setClientNotes] = useState(annotation.clientNotes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

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
        body: JSON.stringify({ pageId: page.id, annotationId: annotation.id, clientNotes }),
      });
      onClientNotesSaved(annotation.id, clientNotes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setNotesSaving(false);
    }
  }

  const field: React.CSSProperties = {
    width: "100%", background: B.offWhite,
    border: `1.5px solid ${B.border}`, borderRadius: 8,
    padding: "10px 14px", fontSize: 13, fontWeight: 400, fontFamily: "Arial, sans-serif", color: "#151515", lineHeight: 1.5,
  };

  const fieldBlock: React.CSSProperties = {
    fontSize: 14, color: B.ink, lineHeight: 1.6,
    background: B.offWhite, borderRadius: 8,
    padding: "12px 14px", border: `1px solid ${B.border}`,
  };

  return (
    <div style={{ width: DETAIL_W, height: "100%", display: "flex", flexDirection: "column", background: B.white, borderLeft: `1px solid ${B.border}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56, borderBottom: `1px solid ${B.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: SEV[form.severity]?.color || B.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: B.white }}>
            {annotation.number}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: B.ink, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {form.title || "Untitled finding"}
            </p>
            {!readonly && <p style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>{annotation.source === "ai" ? "AI Finding" : "Manual Finding"}</p>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: B.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px", flexShrink: 0 }}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {readonly ? (
          // ── Read-only view for clients ──
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: CAT[annotation.category]?.accent || "#eee", color: CAT[annotation.category]?.color || B.ink, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {CAT[annotation.category]?.label || annotation.category}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEV[annotation.severity]?.color || B.muted }}>{annotation.severity}</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: B.ink, lineHeight: 1.5 }}>{annotation.title}</p>
            {annotation.detail && <div><label style={LBL}>Observed</label><p style={fieldBlock}>{annotation.detail}</p></div>}
            {annotation.recommendation && <div><label style={LBL}>Recommendation</label><p style={fieldBlock}>{annotation.recommendation}</p></div>}
          </>
        ) : (
          // ── Editable form ──
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={LBL}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ ...field, border: `1.5px solid ${CAT[form.category]?.color || B.border}`, cursor: "pointer" }}>
                  {Object.keys(CAT).map(c => <option key={c} value={c}>{CAT[c].label}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Importance</label>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  style={{ ...field, border: `1.5px solid ${SEV[form.severity]?.color || B.border}`, color: SEV[form.severity]?.color || B.ink, cursor: "pointer" }}>
                  {Object.keys(SEV).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={LBL}>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Short description of the issue" style={field} />
            </div>
            <div>
              <label style={LBL}>Observed</label>
              <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                placeholder="What did you observe?" rows={3} style={{ ...field, resize: "vertical" }} />
            </div>
            <div>
              <label style={LBL}>Recommendation</label>
              <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                placeholder="What should be done?" rows={3} style={{ ...field, resize: "vertical" }} />
            </div>
          </>
        )}

        {/* Client notes — always present */}
        <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 18 }}>
          <label style={LBL}>Client notes</label>
          <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
            placeholder="Add notes or feedback here…" rows={3}
            style={{ ...field, background: readonly ? "#fffbe6" : B.offWhite, border: `1.5px solid ${readonly ? "#f0d060" : B.border}`, resize: "vertical" }} />
          {readonly && (
            <button onClick={saveClientNotes} disabled={notesSaving}
              style={{ marginTop: 10, background: notesSaved ? "#00c48c" : B.ink, color: B.white, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}>
              {notesSaved ? "✓ Saved" : notesSaving ? "Saving…" : "Save notes"}
            </button>
          )}
        </div>
      </div>

      {/* Footer — edit mode only */}
      {!readonly && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${B.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={save} disabled={!form.title.trim()}
            style={{ flex: 1, background: B.red, color: B.white, border: "none", borderRadius: 8, padding: "11px", fontWeight: 800, fontSize: 14, cursor: form.title.trim() ? "pointer" : "not-allowed", opacity: form.title.trim() ? 1 : 0.5 }}>
            Save finding
          </button>
          <button onClick={() => onDelete(annotation.id)}
            style={{ background: B.offWhite, color: B.red, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "11px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── OVERVIEW EDITOR ─────────────────────────────────────────────────────────
function OverviewEditor({ overview, onSave, readonly, report, password }: {
  overview: any; onSave: (o: any) => void; readonly: boolean; report: any; password: string | null;
}) {
  const [form, setForm] = useState({
    summary: overview?.summary || "",
    keyFindings: overview?.keyFindings || "",
    urgentFixes: overview?.urgentFixes || "",
  });
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  function handleBlur() { onSave(form); }

  async function generate(field: "summary" | "keyFindings" | "urgentFixes") {
    if (!password) return;
    setGenerating(g => ({ ...g, [field]: true }));
    try {
      const res = await fetch("/api/ai-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify({ report, field }),
      });
      const data = await res.json();
      if (data.text) {
        const updated = { ...form, [field]: data.text };
        setForm(updated);
        onSave(updated);
      }
    } finally {
      setGenerating(g => ({ ...g, [field]: false }));
    }
  }

  const ta: React.CSSProperties = {
    width: "100%", background: B.white, border: `1.5px solid ${B.border}`,
    borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 400,
    fontFamily: "Arial, sans-serif", color: "#151515", lineHeight: 1.6,
    resize: "vertical" as any, minHeight: 180,
  };

  const genBtn = (field: "summary" | "keyFindings" | "urgentFixes") => readonly ? null : (
    <button onClick={() => generate(field)} disabled={generating[field]}
      style={{ background: B.ink, color: B.white, border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: generating[field] ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: generating[field] ? 0.7 : 1 }}>
      {generating[field]
        ? <><div style={{ width: 13, height: 13, border: `2px solid #444`, borderTop: `2px solid ${B.red}`, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />Generating…</>
        : "✦ Generate"}
    </button>
  );

  if (readonly) {
    const parseLines = (text: string) =>
      text.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[-–•]\s*/, ""));

    return (
      <div style={{ width: "100%" }}>
        {/* Hero header */}
        <div style={{ padding: "8px 0 28px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: B.red, marginBottom: 10 }}>{report.siteName}</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: B.ink, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6 }}>Report Summary</p>
        </div>

        {/* Summary */}
        {form.summary && (
          <div style={{ padding: "0 0 24px" }}>
            <p style={{ fontSize: 15, color: B.ink, lineHeight: 1.8 }}>{form.summary}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: form.keyFindings && form.urgentFixes ? "1fr 1fr" : "1fr", gap: 16 }}>
          {/* Key Findings */}
          {form.keyFindings && (
            <div style={{ background: "#ededee", borderRadius: 12, padding: "28px 32px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: B.muted, marginBottom: 18 }}>Key Findings</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {parseLines(form.keyFindings).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.red, flexShrink: 0, marginTop: 7 }} />
                    <p style={{ fontSize: 14, color: B.ink, lineHeight: 1.6 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent Fixes */}
          {form.urgentFixes && (
            <div style={{ background: "#ededee", borderRadius: 12, padding: "28px 32px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: B.red, marginBottom: 18 }}>Urgent Fixes</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {parseLines(form.urgentFixes).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: "#fff0f3", border: `1px solid ${B.red}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.red }} />
                    </div>
                    <p style={{ fontSize: 14, color: B.ink, lineHeight: 1.6 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: B.ink, marginBottom: 4 }}>Report Summary</p>
      <p style={{ fontSize: 13, color: B.muted, marginBottom: 28, lineHeight: 1.5 }}>
        Optional fields — anything filled in will appear as the first section of the exported report.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <label style={{ ...LBL, marginBottom: 0 }}>Summary</label>
            {genBtn("summary")}
          </div>
          <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            onBlur={handleBlur} placeholder="Brief overview of the audit scope and overall assessment…"
            rows={4} style={ta} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <label style={{ ...LBL, marginBottom: 0 }}>Key Findings</label>
            {genBtn("keyFindings")}
          </div>
          <textarea value={form.keyFindings} onChange={e => setForm(f => ({ ...f, keyFindings: e.target.value }))}
            onBlur={handleBlur} placeholder="Top themes and observations across the site…"
            rows={5} style={ta} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <label style={{ ...LBL, marginBottom: 0 }}>Urgent Fixes</label>
            {genBtn("urgentFixes")}
          </div>
          <textarea value={form.urgentFixes} onChange={e => setForm(f => ({ ...f, urgentFixes: e.target.value }))}
            onBlur={handleBlur} placeholder="Critical issues requiring immediate attention…"
            rows={4} style={ta} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN REPORT PAGE ─────────────────────────────────────────────────────────
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<any | null>(null);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null);
  const [addPageModal, setAddPageModal] = useState(false);
  const [newPageForm, setNewPageForm] = useState<{ name: string; url: string; devices: string[] }>({ name: "", url: "", devices: ["desktop", "mobile"] });
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [showOverview, setShowOverview] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "1"
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("annotate-password");
    if (saved) setPassword(saved);
    const p = new URLSearchParams(window.location.search);
    if (p.get("view") === "1") setReadonly(true);
  }, []);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(data => {
        setReport(data);
        const isReadonly = new URLSearchParams(window.location.search).get("view") === "1";
        if (!isReadonly) setActivePageId(data.pages?.[0]?.id || null);
        setLoading(false);
      })
      .catch(() => { setError("Report not found."); setLoading(false); });
  }, [id]);

  function updatePage(updatedPage: any) {
    const pages = report.pages.map((p: any) => p.id === updatedPage.id ? updatedPage : p);
    const updated = { ...report, pages };
    setReport(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function deletePage(pageId: string) {
    if (!confirm("Delete this page and all its annotations?")) return;
    const pages = report.pages.filter((p: any) => p.id !== pageId);
    const updated = { ...report, pages };
    setReport(updated);
    if (activePageId === pageId) setActivePageId(pages[0]?.id || null);
    saveReport(updated);
  }

  async function saveReport(data: any) {
    if (!password || readonly) return;
    setSaving(true);
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-audit-password": password },
        body: JSON.stringify(data),
      });
    } catch {}
    setSaving(false);
  }

  function copyShareLink() {
    const url = `${window.location.origin}/report/${id}?view=1`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function exportHTML() {
    const shareUrl = `${window.location.origin}/report/${id}?view=1`;
    const html = generateExportHTML(report, shareUrl);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `youwe-annotate-${report.siteName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function addManualPage() {
    setNewPageForm({ name: "", url: "", devices: ["desktop", "mobile"] });
    setCaptureError("");
    setAddPageModal(true);
  }

  async function submitNewPage() {
    const { name, url, devices } = newPageForm;
    if (!name.trim() || devices.length === 0) return;
    const newPages = devices.map(device => ({ id: genId(), name: name.trim(), url: url.trim(), device, screenshotUrl: "", annotations: [] }));
    const updated = { ...report, pages: [...report.pages, ...newPages] };
    setReport(updated);
    setActivePageId(newPages[0].id);
    setAddPageModal(false);
    await saveReport(updated);
  }

  async function captureNewPage() {
    const { name, url, devices } = newPageForm;
    if (!name.trim() || !url.trim() || devices.length === 0 || !password) return;
    setCapturing(true);
    setCaptureError("");
    try {
      const newPages: any[] = [];
      // Sequential, not concurrent — running two thorough captures at once was found
      // to contend for CPU and be slower overall than one at a time (see app/api/reports/route.ts).
      for (const device of devices) {
        const res = await fetch("/api/capture-page", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-audit-password": password },
          body: JSON.stringify({ url: url.trim(), device }),
        });
        const data = await res.json();
        if (res.ok) newPages.push({ id: genId(), name: name.trim(), url: url.trim(), device, screenshotUrl: data.url, annotations: [] });
      }
      if (newPages.length === 0) throw new Error("Failed to capture screenshot for any selected device");
      const updated = { ...report, pages: [...report.pages, ...newPages] };
      setReport(updated);
      setActivePageId(newPages[0].id);
      setAddPageModal(false);
      await saveReport(updated);
    } catch (e: any) {
      setCaptureError(e.message || "Failed to capture screenshot");
    } finally {
      setCapturing(false);
    }
  }

  function updatePageMeta(pageId: string, name: string, url: string, device: string) {
    const pages = report.pages.map((p: any) => p.id === pageId ? { ...p, name, url, device } : p);
    const updated = { ...report, pages };
    setReport(updated);
    saveReport(updated);
  }

  function updateOverview(overview: any) {
    const updated = { ...report, overview };
    setReport(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function closeComments() {
    setCommentsOpen(false);
    setSelectedAnnotation(null);
    setHighlightedAnnotationId(null);
  }

  function saveAnnotationFromDetail(updatedAnnotation: any) {
    if (!activePage) return;
    const pages = report.pages.map((p: any) => {
      if (p.id !== activePage.id) return p;
      return { ...p, annotations: p.annotations.map((a: any) => a.id === updatedAnnotation.id ? updatedAnnotation : a) };
    });
    const updated = { ...report, pages };
    setReport(updated);
    setSelectedAnnotation(updatedAnnotation);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function deleteAnnotationFromDetail(annotationId: string) {
    if (!activePage) return;
    const pages = report.pages.map((p: any) => {
      if (p.id !== activePage.id) return p;
      return { ...p, annotations: p.annotations.filter((a: any) => a.id !== annotationId).map((a: any, i: number) => ({ ...a, number: i + 1 })) };
    });
    const updated = { ...report, pages };
    setReport(updated);
    setSelectedAnnotation(null);
    setHighlightedAnnotationId(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveReport(updated), 1200);
  }

  function handleClientNotesSaved(pageId: string, annotationId: string, notes: string) {
    const pages = report.pages.map((p: any) => {
      if (p.id !== pageId) return p;
      return { ...p, annotations: p.annotations.map((a: any) => a.id === annotationId ? { ...a, clientNotes: notes } : a) };
    });
    setReport({ ...report, pages });
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: B.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: `4px solid #2a2a2a`, borderTop: `4px solid ${B.red}`, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: B.red, fontWeight: 700, fontSize: 14 }}>{error}</p>
    </div>
  );

  const activePage = report.pages.find((p: any) => p.id === activePageId);
  // Always show the freshest version of the selected annotation
  const currentSelected = activePage?.annotations?.find((a: any) => a.id === selectedAnnotation?.id) ?? selectedAnnotation;

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: B.offWhite, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── ADD PAGE MODAL ── */}
      {addPageModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}
          onClick={() => !capturing && setAddPageModal(false)}>
          <div style={{ background: B.white, borderRadius: 12, width: 420, padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", gap: 18 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: B.ink }}>Add new page</p>
              <button onClick={() => !capturing && setAddPageModal(false)} disabled={capturing} style={{ background: "none", border: "none", fontSize: 22, color: capturing ? "#ccc" : B.muted, cursor: capturing ? "not-allowed" : "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={LBL}>Page name</label>
                <input autoFocus value={newPageForm.name} onChange={e => setNewPageForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Checkout step 2"
                  style={{ width: "100%", background: B.offWhite, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#151515", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={LBL}>Page URL</label>
                <input value={newPageForm.url} onChange={e => setNewPageForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://example.com/checkout"
                  style={{ width: "100%", background: B.offWhite, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#151515", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={LBL}>Device type</label>
                <div style={{ display: "flex", gap: 16 }}>
                  {(["desktop", "mobile"] as const).map(d => (
                    <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "Arial, sans-serif", color: "#151515", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={newPageForm.devices.includes(d)}
                        onChange={e => setNewPageForm(f => ({
                          ...f,
                          devices: e.target.checked ? [...f.devices, d] : f.devices.filter(x => x !== d),
                        }))}
                      />
                      {d === "desktop" ? "Desktop" : "Mobile"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {captureError && <p style={{ fontSize: 12, color: B.red, margin: 0 }}>{captureError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4, flexWrap: "wrap" }}>
              <button onClick={() => setAddPageModal(false)} disabled={capturing}
                style={{ background: B.offWhite, color: B.ink, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: capturing ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={captureNewPage} disabled={capturing || !newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0}
                title={!newPageForm.url.trim() ? "Enter a page URL to capture a screenshot" : undefined}
                style={{ background: B.ink, color: B.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: (capturing || !newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0) ? "not-allowed" : "pointer", opacity: (!newPageForm.name.trim() || !newPageForm.url.trim() || newPageForm.devices.length === 0) ? 0.5 : 1 }}>
                {capturing ? "Capturing…" : "Capture & Add Page"}
              </button>
              <button onClick={submitNewPage} disabled={!newPageForm.name.trim() || newPageForm.devices.length === 0 || capturing}
                style={{ background: B.red, color: B.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: (newPageForm.name.trim() && newPageForm.devices.length > 0 && !capturing) ? "pointer" : "not-allowed", opacity: (newPageForm.name.trim() && newPageForm.devices.length > 0) ? 1 : 0.5 }}>
                Add page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{ background: B.ink, borderBottom: `2px solid ${B.red}`, flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/" style={{ textDecoration: "none" }}><YouweLogo height={38} /></a>
            <div style={{ width: 1, height: 28, background: "#2a2a2a" }} />
            <div>
              {!readonly && editingTitle ? (
                <input
                  autoFocus
                  value={titleInput}
                  onChange={e => {
                    const val = e.target.value;
                    setTitleInput(val);
                    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
                    titleSaveTimer.current = setTimeout(() => {
                      const name = val.trim();
                      if (name) { const updated = { ...report, siteName: name }; setReport(updated); saveReport(updated); }
                    }, 400);
                  }}
                  onBlur={() => {
                    const name = titleInput.trim();
                    if (name) {
                      const updated = { ...report, siteName: name };
                      setReport(updated);
                      saveReport(updated);
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
                  style={{ fontSize: 16, fontWeight: 800, color: B.white, background: "#2a2a2a", border: "none", borderBottom: `1.5px solid ${B.red}`, outline: "none", letterSpacing: "-0.01em", width: 240, padding: "2px 0" }}
                />
              ) : (
                <div onClick={() => { if (!readonly) { setTitleInput(report.siteName); setEditingTitle(true); } }}
                  onMouseEnter={e => { if (!readonly) (e.currentTarget.querySelector("p") as HTMLElement).style.textDecoration = "underline"; }}
                  onMouseLeave={e => { if (!readonly) (e.currentTarget.querySelector("p") as HTMLElement).style.textDecoration = "none"; }}
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: readonly ? "default" : "text" }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: B.white, letterSpacing: "-0.01em" }}>{report.siteName}</p>
                  {!readonly && (
                    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5zM8.5 3.5l2 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              )}
              <p style={{ fontSize: 12, color: B.muted }}>{report.url}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <span style={{ fontSize: 12, color: B.muted }}>Saving…</span>}
            {!readonly && (
              <button onClick={addManualPage} style={{ background: "transparent", border: `1.5px solid #333`, color: B.muted, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                + Add page
              </button>
            )}
            <button onClick={copyShareLink} style={{ background: copied ? "#00c48c" : "#1e1e1e", color: B.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}>
              {copied ? "✓ Copied" : "Share link"}
            </button>
            <button onClick={exportHTML} style={{ background: B.red, color: B.white, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ↓ Export
            </button>
            {!readonly && (
              <button onClick={() => { sessionStorage.removeItem("annotate-password"); window.location.href = "/"; }} style={{ fontSize: 13, color: B.muted, background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ROW ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar — pages list */}
        <aside style={{ width: 220, flexShrink: 0, padding: "20px 0", borderRight: `1px solid ${B.border}`, background: B.white, overflowY: "auto" }}>
          <button onClick={() => { setShowOverview(true); setActivePageId(null); setCommentsOpen(false); setSelectedAnnotation(null); setHighlightedAnnotationId(null); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: showOverview ? B.offWhite : "transparent", border: "none", borderLeft: `3px solid ${showOverview ? B.red : "transparent"}`, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <rect x="1" y="1" width="12" height="3" rx="1" stroke="#151515" strokeWidth="1.4"/>
              <rect x="1" y="6" width="8" height="3" rx="1" stroke="#151515" strokeWidth="1.4"/>
              <rect x="1" y="11" width="5" height="2" rx="1" stroke="#151515" strokeWidth="1.4"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: B.ink }}>Summary</span>
          </button>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: B.muted, padding: "0 16px", marginBottom: 8 }}>Pages</p>
          {report.pages.map((p: any) => (
            <div key={p.id} style={{ position: "relative", display: "flex", alignItems: "stretch" }}
              onMouseEnter={e => { const btn = e.currentTarget.querySelector<HTMLElement>(".del-page"); if (btn) btn.style.opacity = "1"; }}
              onMouseLeave={e => { const btn = e.currentTarget.querySelector<HTMLElement>(".del-page"); if (btn) btn.style.opacity = "0"; }}>
              <button onClick={() => { setActivePageId(p.id); setShowOverview(false); }}
                style={{ flex: 1, textAlign: "left", padding: "10px 16px", background: p.id === activePageId ? B.offWhite : "transparent", border: "none", borderLeft: `3px solid ${p.id === activePageId ? B.red : "transparent"}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2, paddingRight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: B.ink }}>{p.name}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: B.muted }}>{p.device === "desktop" ? "🖥" : "📱"} {p.device}</span>
                  {p.annotations.length > 0 && (
                    <span style={{ fontSize: 11, background: B.red, color: B.white, borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>{p.annotations.length}</span>
                  )}
                </div>
              </button>
              {!readonly && (
                <button className="del-page" onClick={e => { e.stopPropagation(); deletePage(p.id); }}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: B.muted, opacity: 0, transition: "opacity 0.15s", padding: "4px 6px", lineHeight: 1 }}
                  title="Delete page">×</button>
              )}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "24px 28px", minWidth: 0, overflowY: "auto" }}>
          {showOverview ? (
            <OverviewEditor
              overview={report.overview}
              onSave={updateOverview}
              readonly={readonly}
              report={report}
              password={password}
            />
          ) : activePage ? (
            <PageEditor
              page={activePage}
              onUpdate={updatePage}
              onMetaUpdate={(name, url, device) => updatePageMeta(activePage.id, name, url, device)}
              password={password}
              readonly={readonly}
              reportId={id}
              highlightedAnnotationId={highlightedAnnotationId}
            />
          ) : (
            <p style={{ color: B.muted, fontSize: 14 }}>Select a page from the sidebar.</p>
          )}
        </main>

        {/* Comment detail panel — slides in between main and list */}
        <div style={{ width: currentSelected ? DETAIL_W : 0, transition: "width 0.22s ease", overflow: "hidden", flexShrink: 0 }}>
          {currentSelected && (
            <CommentDetail
              key={currentSelected.id}
              annotation={currentSelected}
              page={activePage}
              onClose={() => { setSelectedAnnotation(null); setHighlightedAnnotationId(null); }}
              onSave={saveAnnotationFromDetail}
              onDelete={deleteAnnotationFromDetail}
              readonly={readonly}
              reportId={id}
              onClientNotesSaved={(annotationId, notes) => handleClientNotesSaved(activePage.id, annotationId, notes)}
            />
          )}
        </div>

        {/* Comments list — rightmost drawer */}
        <div style={{ width: commentsOpen ? LIST_W : 0, transition: "width 0.22s ease", overflow: "hidden", flexShrink: 0, borderLeft: commentsOpen ? `1px solid ${B.border}` : "none" }}>
          {commentsOpen && activePage && (
            <CommentsList
              page={activePage}
              selectedId={selectedAnnotation?.id ?? null}
              onSelect={a => { setSelectedAnnotation(a); setHighlightedAnnotationId(a.id); }}
              highlightedId={highlightedAnnotationId}
              onHighlight={setHighlightedAnnotationId}
              onClose={closeComments}
            />
          )}
        </div>

      </div>

      {/* Fixed toolbar */}
      <BottomToolbar
        annotationCount={activePage?.annotations?.length ?? 0}
        commentsOpen={commentsOpen}
        onToggleComments={() => {
          if (commentsOpen) closeComments();
          else setCommentsOpen(true);
        }}
      />

    </div>
  );
}
