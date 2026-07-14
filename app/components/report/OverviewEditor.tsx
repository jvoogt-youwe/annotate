"use client";
import { useState } from "react";
import { LBL_CLASS } from "../../lib/theme";
import type { DataSource, Overview, Report } from "../../lib/types";
import { DataSourcesPanel } from "./DataSourcesPanel";

// ─── OVERVIEW EDITOR ─────────────────────────────────────────────────────────
export function OverviewEditor({ overview, onSave, readonly, report, password, onUpdateDataSources }: {
  overview: Overview | undefined; onSave: (o: Overview) => void; readonly: boolean; report: Report; password: string | null;
  onUpdateDataSources: (sources: DataSource[]) => void;
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

  const taClass =
    "w-full bg-brand-white border-[1.5px] border-brand-border rounded-lg px-3.5 py-2.5 text-[13px] font-normal font-[Arial,sans-serif] text-[#151515] leading-[1.6] resize-y min-h-[180px]";

  const genBtn = (field: "summary" | "keyFindings" | "urgentFixes") => readonly ? null : (
    <button onClick={() => generate(field)} disabled={generating[field]}
      className="bg-brand-ink text-brand-white border-none rounded-lg px-3.5 py-[7px] font-bold text-[13px] flex items-center gap-[7px]"
      style={{ cursor: generating[field] ? "not-allowed" : "pointer", opacity: generating[field] ? 0.7 : 1 }}>
      {generating[field]
        ? <><div className="w-[13px] h-[13px] rounded-full border-2 border-[#444] border-t-brand-red animate-spin" />Generating…</>
        : "✦ Generate"}
    </button>
  );

  if (readonly) {
    const parseLines = (text: string) =>
      text.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[-–•]\s*/, ""));

    return (
      <div className="w-full">
        {/* Hero header */}
        <div className="pt-2 pb-7">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand-red mb-2.5">{report.siteName}</p>
          <p className="text-[32px] font-black text-brand-ink tracking-[-0.02em] leading-[1.15] mb-1.5">Report Summary</p>
        </div>

        {/* Summary */}
        {form.summary && (
          <div className="pb-6">
            <p className="text-[15px] text-brand-ink leading-[1.8]">{form.summary}</p>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: form.keyFindings && form.urgentFixes ? "1fr 1fr" : "1fr" }}>
          {/* Key Findings */}
          {form.keyFindings && (
            <div className="bg-[#ededee] rounded-xl px-8 py-7">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted mb-[18px]">Key Findings</p>
              <div className="flex flex-col gap-3.5">
                {parseLines(form.keyFindings).map((line, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0 mt-[7px]" />
                    <p className="text-sm text-brand-ink leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent Fixes */}
          {form.urgentFixes && (
            <div className="bg-[#ededee] rounded-xl px-8 py-7">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-red mb-[18px]">Urgent Fixes</p>
              <div className="flex flex-col gap-3.5">
                {parseLines(form.urgentFixes).map((line, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-[18px] h-[18px] rounded shrink-0 flex items-center justify-center mt-0.5 bg-[#fff0f3] border border-brand-red">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                    </div>
                    <p className="text-sm text-brand-ink leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DataSourcesPanel dataSources={report.dataSources || []} onChange={onUpdateDataSources} readonly password={password} />
      </div>
    );
  }

  return (
    <div className="max-w-[720px]">
      <p className="text-base font-bold text-brand-ink mb-1">Report Summary</p>
      <p className="text-[13px] text-brand-muted mb-7 leading-normal">
        Optional fields — anything filled in will appear as the first section of the exported report.
      </p>
      <div className="flex flex-col gap-[22px]">
        <div>
          <div className="flex items-center justify-between mb-[7px]">
            <label className={`${LBL_CLASS} mb-0`}>Summary</label>
            {genBtn("summary")}
          </div>
          <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            onBlur={handleBlur} placeholder="Brief overview of the audit scope and overall assessment…"
            rows={4} className={taClass} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-[7px]">
            <label className={`${LBL_CLASS} mb-0`}>Key Findings</label>
            {genBtn("keyFindings")}
          </div>
          <textarea value={form.keyFindings} onChange={e => setForm(f => ({ ...f, keyFindings: e.target.value }))}
            onBlur={handleBlur} placeholder="Top themes and observations across the site…"
            rows={5} className={taClass} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-[7px]">
            <label className={`${LBL_CLASS} mb-0`}>Urgent Fixes</label>
            {genBtn("urgentFixes")}
          </div>
          <textarea value={form.urgentFixes} onChange={e => setForm(f => ({ ...f, urgentFixes: e.target.value }))}
            onBlur={handleBlur} placeholder="Critical issues requiring immediate attention…"
            rows={4} className={taClass} />
        </div>
      </div>

      <DataSourcesPanel dataSources={report.dataSources || []} onChange={onUpdateDataSources} readonly={false} password={password} />
    </div>
  );
}
