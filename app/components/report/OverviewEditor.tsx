"use client";
import { useState } from "react";
import type { Overview, Report } from "../../lib/types";

// ─── OVERVIEW EDITOR ─────────────────────────────────────────────────────────
export function OverviewEditor({ overview, onSave, readonly, report, password }: {
  overview: Overview | undefined; onSave: (o: Overview) => void; readonly: boolean; report: Report; password: string | null;
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

  const genBtn = (field: "summary" | "keyFindings" | "urgentFixes") => readonly ? null : (
    <button onClick={() => generate(field)} disabled={generating[field]}
      className="bg-brand-ink text-brand-white border-none rounded-lg px-3.5 py-[7px] font-bold text-[13px] flex items-center gap-[7px] shrink-0"
      style={{ cursor: generating[field] ? "not-allowed" : "pointer", opacity: generating[field] ? 0.7 : 1 }}>
      {generating[field]
        ? <><div className="w-[13px] h-[13px] rounded-full border-2 border-[#444] border-t-brand-red animate-spin" />Generating…</>
        : "✦ Generate"}
    </button>
  );

  const parseLines = (text: string) =>
    text.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[-–•]\s*/, ""));

  // Lightweight **bold** support for AI-generated copy — enough for emphasis
  // without pulling in a full markdown renderer.
  const renderInline = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-bold text-brand-ink">{part}</strong> : part
    );

  // Splits the summary into lead paragraph(s) plus a trailing bullet list
  // (dash-prefixed lines), so a plain block of AI copy reads as a real report
  // section instead of one dense paragraph.
  const parseSummary = (text: string) => {
    const paragraphs: string[] = [];
    const bullets: string[] = [];
    text.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
      if (/^[-–•]\s+/.test(line)) bullets.push(line.replace(/^[-–•]\s*/, ""));
      else paragraphs.push(line);
    });
    return { paragraphs, bullets };
  };

  if (readonly) {
    return (
      <div className="max-w-[960px] mx-auto pb-4">
        {/* Hero header */}
        <div className="pt-3 pb-7 mb-8 border-b border-brand-border">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand-red mb-3">{report.siteName}</p>
          <h1 className="text-[34px] font-black text-brand-ink tracking-[-0.02em] leading-[1.15]">Report Summary</h1>
        </div>

        {/* Summary */}
        {form.summary && (() => {
          const { paragraphs, bullets } = parseSummary(form.summary);
          return (
            <div className="mb-10">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[16px] text-brand-ink leading-[1.75] mb-3 last:mb-0">{renderInline(p)}</p>
              ))}
              {bullets.length > 0 && (
                <>
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted mt-6 mb-3">At a glance</p>
                  <div className="flex flex-col gap-2.5">
                    {bullets.map((b, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0 mt-[9px]" />
                        <p className="text-[15px] text-brand-ink leading-[1.6]">{renderInline(b)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        <div className="grid gap-5 items-stretch" style={{ gridTemplateColumns: form.keyFindings && form.urgentFixes ? "1fr 1fr" : "1fr" }}>
          {/* Key Findings */}
          {form.keyFindings && (
            <div className="bg-[#ededee] rounded-2xl px-8 py-7">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted mb-5">Key Findings</p>
              <div className="flex flex-col gap-4">
                {parseLines(form.keyFindings).map((line, i) => (
                  <div key={i} className="flex gap-3.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0 mt-[8px]" />
                    <p className="text-sm text-brand-ink leading-[1.65]">{renderInline(line)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent Fixes */}
          {form.urgentFixes && (
            <div className="bg-[#ededee] rounded-2xl px-8 py-7">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-red mb-5">Urgent Fixes</p>
              <div className="flex flex-col gap-4">
                {parseLines(form.urgentFixes).map((line, i) => (
                  <div key={i} className="flex gap-3.5 items-start">
                    <div className="w-[18px] h-[18px] rounded shrink-0 flex items-center justify-center mt-0.5 bg-[#fff0f3] border border-brand-red">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                    </div>
                    <p className="text-sm text-brand-ink leading-[1.65]">{renderInline(line)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Editable view — styled as report panels rather than a plain form, so
  // authoring the summary feels like drafting the document itself. ──
  return (
    <div className="max-w-[960px] mx-auto pb-4">
      <div className="pt-3 pb-7 mb-8 border-b border-brand-border">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand-red mb-3">{report.siteName}</p>
        <h1 className="text-[34px] font-black text-brand-ink tracking-[-0.02em] leading-[1.15] mb-2">Report Summary</h1>
        <p className="text-[13px] text-brand-muted leading-normal">
          Optional — anything filled in here appears as the opening section of the client-facing report.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-brand-white border border-brand-border rounded-2xl px-7 py-6">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted">Summary</p>
            {genBtn("summary")}
          </div>
          <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            onBlur={handleBlur} placeholder="Brief overview of the audit scope and overall assessment…"
            rows={4}
            className="w-full border-none outline-none resize-y bg-transparent p-0 text-[16px] leading-[1.75] text-brand-ink placeholder:text-brand-muted" />
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="bg-[#ededee] rounded-2xl px-7 py-6">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-muted">Key Findings</p>
              {genBtn("keyFindings")}
            </div>
            <textarea value={form.keyFindings} onChange={e => setForm(f => ({ ...f, keyFindings: e.target.value }))}
              onBlur={handleBlur} placeholder="Top themes and observations across the site, one per line…"
              rows={6}
              className="w-full border-none outline-none resize-y bg-transparent p-0 text-sm leading-[1.65] text-brand-ink placeholder:text-brand-muted" />
          </div>

          <div className="bg-[#ededee] rounded-2xl px-7 py-6">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand-red">Urgent Fixes</p>
              {genBtn("urgentFixes")}
            </div>
            <textarea value={form.urgentFixes} onChange={e => setForm(f => ({ ...f, urgentFixes: e.target.value }))}
              onBlur={handleBlur} placeholder="Critical issues requiring immediate attention, one per line…"
              rows={6}
              className="w-full border-none outline-none resize-y bg-transparent p-0 text-sm leading-[1.65] text-brand-ink placeholder:text-brand-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
