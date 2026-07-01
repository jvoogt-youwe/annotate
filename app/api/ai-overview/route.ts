import { NextRequest, NextResponse } from "next/server";

function auth(req: NextRequest) {
  return req.headers.get("x-audit-password") === process.env.AUDIT_PASSWORD;
}

const PROMPTS: Record<string, (ctx: any) => string> = {
  summary: ({ siteName, url, pageCount, pageNames, totalFindings, bySeverity, byCategory }) =>
    `You are writing the executive summary of a UX audit report for ${siteName} (${url}).

The audit covered ${pageCount} page${pageCount !== 1 ? "s" : ""}: ${pageNames}.
Total findings: ${totalFindings} — Critical: ${bySeverity.Critical}, High: ${bySeverity.High}, Medium: ${bySeverity.Medium}, Low: ${bySeverity.Low}.
By category — UX: ${byCategory.UX}, Accessibility: ${byCategory.A11y}, CRO: ${byCategory.CRO}, Performance: ${byCategory.Perf}.

Write a concise executive summary (2–3 short paragraphs) for a client-facing UX report. Cover what was audited, the overall UX health, and the most important themes. Be professional, constructive, and specific. Return plain text only — no markdown, no bullet points, no headers.`,

  keyFindings: ({ siteName, findings }) =>
    `You are writing the Key Findings section of a UX audit report for ${siteName}.

All findings from the audit:
${findings}

Write 4–6 key themes that group and summarise the most significant patterns across the audit. Each theme should be 1–2 sentences, written as a dash-prefixed item on its own line. Focus on recurring issues and highest-impact problems. Be specific and constructive. Return plain text only — no markdown headers, no numbering.`,

  urgentFixes: ({ siteName, urgentFindings }) =>
    `You are writing the Urgent Fixes section of a UX audit report for ${siteName}.

Critical and High severity findings:
${urgentFindings || "No critical or high severity findings recorded."}

List the most urgent fixes as short, actionable items — one per line, prefixed with a dash. Maximum 8 items. Focus on what specifically needs to change, ordered by severity and user impact. Return plain text only — no markdown, no headers.`,
};

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { report, field } = await req.json();
  if (!report || !field || !PROMPTS[field]) {
    return NextResponse.json({ error: "report and valid field required" }, { status: 400 });
  }

  const allAnnotations = report.pages.flatMap((p: any) =>
    p.annotations.map((a: any) => ({ ...a, pageName: p.name, device: p.device }))
  );

  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  const byCategory = { UX: 0, A11y: 0, CRO: 0, Perf: 0 } as Record<string, number>;
  allAnnotations.forEach((a: any) => {
    if (bySeverity[a.severity] !== undefined) bySeverity[a.severity]++;
    if (byCategory[a.category] !== undefined) byCategory[a.category]++;
  });

  const findings = allAnnotations
    .map((a: any) => `- [${a.severity}/${a.category}] ${a.title}: ${a.detail || ""}${a.recommendation ? ` → ${a.recommendation}` : ""} (${a.pageName}, ${a.device})`)
    .join("\n");

  const urgentFindings = allAnnotations
    .filter((a: any) => a.severity === "Critical" || a.severity === "High")
    .map((a: any) => `- [${a.severity}] ${a.title}: ${a.detail || ""} (${a.pageName})`)
    .join("\n");

  const ctx = {
    siteName: report.siteName,
    url: report.url,
    pageCount: report.pages.length,
    pageNames: report.pages.map((p: any) => `${p.name} (${p.device})`).join(", "),
    totalFindings: allAnnotations.length,
    bySeverity,
    byCategory,
    findings,
    urgentFindings,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: "user", content: PROMPTS[field](ctx) }],
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "API error" }, { status: res.status });

  const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
  return NextResponse.json({ text: text.trim() });
}
