"use client";
import { useRef, useState } from "react";
import { genId } from "../../lib/theme";
import type { DataSource } from "../../lib/types";

// A bare "docs.google.com/..." has no scheme, so <a href> would treat it as a
// relative path instead of navigating offsite — prefix a scheme when missing.
function withProtocol(url: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

function iconFor(contentType: string) {
  if (contentType === "link") return "🔗";
  if (contentType.startsWith("image/")) return "🖼";
  if (contentType === "text/csv" || contentType.includes("csv")) return "📊";
  if (contentType === "application/pdf") return "📄";
  return "📎";
}

function typeLabel(contentType: string) {
  if (contentType === "link") return "Link";
  if (contentType.startsWith("image/")) return "Image";
  if (contentType === "text/csv" || contentType.includes("csv")) return "CSV";
  if (contentType === "application/pdf") return "PDF";
  return "File";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// ─── RESOURCES PAGE ────────────────────────────────────────────────────────────
// Analytics exports / screenshots referenced by the AI and shown to clients as
// the source data behind recommendations — its own tab, laid out as a table.
export function ResourcesPage({ report, dataSources, onChange, readonly, password }: {
  report: import("../../lib/types").Report;
  dataSources: DataSource[]; onChange: (sources: DataSource[]) => void;
  readonly: boolean; password: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addLink() {
    const raw = linkUrl.trim();
    if (!raw) return;
    const url = withProtocol(raw);
    onChange([...dataSources, { id: genId(), name: url, url, contentType: "link", uploadedAt: new Date().toISOString() }]);
    setLinkUrl("");
  }

  async function handleUpload(file: File) {
    if (!password) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/data-sources", { method: "POST", headers: { "x-audit-password": password }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange([...dataSources, data as DataSource]);
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  function remove(id: string) {
    onChange(dataSources.filter(s => s.id !== id));
  }

  return (
    <div className="max-w-[960px] mx-auto pb-4">
      <div className="pt-3 pb-7 mb-8 border-b border-brand-border">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand-red mb-3">{report.siteName}</p>
        <h1 className="text-[34px] font-black text-brand-ink tracking-[-0.02em] leading-[1.15] mb-2">Resources</h1>
        <p className="text-[13px] text-brand-muted leading-normal">
          {readonly
            ? "Analytics exports and supporting material referenced in this audit."
            : "Upload analytics exports (Google Analytics, Clarity, etc.) as CSV, screenshots, or reports. The AI references these when generating findings, and clients can see them as the source behind your recommendations."}
        </p>
      </div>

      {!readonly && (
        <>
          <input ref={fileRef} type="file" accept=".csv,text/csv,image/*,.pdf,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          <div
            onClick={() => !uploading && password && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (password && !uploading) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f && password && !uploading) handleUpload(f);
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 mb-4"
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
                <span className="text-xs text-brand-muted">or <span className="text-brand-blue font-bold">browse files</span> — CSV, image, or PDF</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex-1 h-px bg-brand-border" />
            <span className="text-xs font-bold text-brand-muted shrink-0">OR ADD A LINK</span>
            <div className="flex-1 h-px bg-brand-border" />
          </div>
          <div className="flex gap-2 mb-6">
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="Confluence page, Google Sheet, or any other URL…"
              onKeyDown={e => { if (e.key === "Enter") addLink(); }}
              className="flex-1 bg-brand-off-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-[Arial,sans-serif] text-[#151515] outline-none" />
            <button onClick={addLink} disabled={!linkUrl.trim()}
              className="shrink-0 bg-brand-ink text-brand-white border-none rounded-lg px-4 py-2.5 text-[13px] font-bold"
              style={{ cursor: linkUrl.trim() ? "pointer" : "not-allowed", opacity: linkUrl.trim() ? 1 : 0.6 }}>
              Add link
            </button>
          </div>
        </>
      )}

      {dataSources.length === 0 ? (
        <p className="text-brand-muted text-sm">No resources added yet.</p>
      ) : (
        <div className="bg-[#ededee] rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted px-7 pt-6 pb-3">Name</th>
                <th className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted px-4 pt-6 pb-3 w-[110px]">Type</th>
                <th className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted px-4 pt-6 pb-3 w-[140px]">Added</th>
                <th className="px-7 pt-6 pb-3 w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {dataSources.map((s, i) => (
                <tr key={s.id} className="bg-brand-white" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e8e8" }}>
                  <td className="px-7 py-3.5">
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 no-underline text-sm text-brand-ink font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-base shrink-0">{iconFor(s.contentType)}</span>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{s.name}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-brand-muted">{typeLabel(s.contentType)}</td>
                  <td className="px-4 py-3.5 text-xs text-brand-muted">{formatDate(s.uploadedAt)}</td>
                  <td className="px-7 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue no-underline shrink-0">View →</a>
                      {!readonly && (
                        <button onClick={() => remove(s.id)}
                          className="bg-transparent border-none text-brand-muted cursor-pointer text-base leading-none shrink-0">×</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
