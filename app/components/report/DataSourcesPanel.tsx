"use client";
import { useRef, useState } from "react";
import { LBL_CLASS } from "../../lib/theme";
import type { DataSource } from "../../lib/types";

function iconFor(contentType: string) {
  if (contentType.startsWith("image/")) return "🖼";
  if (contentType === "text/csv" || contentType.includes("csv")) return "📊";
  if (contentType === "application/pdf") return "📄";
  return "📎";
}

// ─── DATA SOURCES (analytics exports / screenshots referenced by the AI, ─────
// ─── and shown to clients as the source data behind recommendations) ─────────
export function DataSourcesPanel({ dataSources, onChange, readonly, password }: {
  dataSources: DataSource[]; onChange: (sources: DataSource[]) => void;
  readonly: boolean; password: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  if (readonly && dataSources.length === 0) return null;

  return (
    <div className={readonly ? "pb-8" : "max-w-[720px] mt-8"}>
      {readonly ? (
        <div className="bg-[#ededee] rounded-xl px-8 py-7">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted mb-[18px]">Source Data</p>
          <div className="flex flex-col gap-2.5">
            {dataSources.map(s => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-brand-white rounded-lg px-3.5 py-3 border border-brand-border no-underline">
                <span className="text-base shrink-0">{iconFor(s.contentType)}</span>
                <span className="text-sm text-brand-ink font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">{s.name}</span>
                <span className="text-xs text-brand-blue shrink-0">View →</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <>
          <label className={LBL_CLASS}>Data sources</label>
          <p className="text-[13px] text-brand-muted mb-2.5 leading-normal">
            Upload analytics exports (Google Analytics, Clarity, etc.) as CSV, screenshots, or reports. The AI references these when generating findings, and clients can see them as the source behind your recommendations.
          </p>
          {dataSources.length > 0 && (
            <div className="flex flex-col gap-2 mb-2.5">
              {dataSources.map(s => (
                <div key={s.id} className="flex items-center gap-2.5 bg-brand-off-white rounded-lg px-3 py-2 border border-brand-border">
                  <span className="shrink-0 text-base">{iconFor(s.contentType)}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-[13px] text-brand-blue no-underline overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                    {s.name}
                  </a>
                  <button onClick={() => remove(s.id)}
                    className="bg-transparent border-none text-brand-muted cursor-pointer text-base leading-none shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
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
                <span className="text-xs text-brand-muted">or <span className="text-brand-blue font-bold">browse files</span> — CSV, image, or PDF</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
