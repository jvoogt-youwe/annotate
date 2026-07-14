import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, genId } from "@/app/lib/auth";
import type { DataSource } from "@/app/lib/types";

const MAX_TEXT_SOURCE_CHARS = 6000;

// Data sources are analytics exports (GA/Clarity CSVs, screenshots, reports) the
// designer uploaded for the whole report. CSV/text content is inlined so the model
// can cite real numbers; images (e.g. a Clarity heatmap) are sent as extra vision
// input; other types (e.g. PDF) are only named — their content isn't parsed here.
async function buildDataSourceContent(dataSources: DataSource[]) {
  const blocks: any[] = [];
  for (const src of dataSources) {
    try {
      if (src.contentType.startsWith("image/")) {
        const imgRes = await fetch(src.url);
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        blocks.push({ type: "text", text: `Supporting data source (image): "${src.name}"` });
        blocks.push({ type: "image", source: { type: "base64", media_type: src.contentType, data: base64 } });
      } else if (src.contentType === "text/csv" || src.contentType.includes("csv") || src.contentType.startsWith("text/")) {
        const textRes = await fetch(src.url);
        const text = (await textRes.text()).slice(0, MAX_TEXT_SOURCE_CHARS);
        blocks.push({ type: "text", text: `Supporting data source (CSV export): "${src.name}"\n${text}` });
      } else {
        blocks.push({ type: "text", text: `Supporting data source available (not readable here — reference by name only): "${src.name}"` });
      }
    } catch {
      // Skip sources that fail to fetch rather than failing the whole analysis.
    }
  }
  return blocks;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { screenshotUrl, pageName, device, dataSources } = await req.json();
  if (!screenshotUrl) return NextResponse.json({ error: "screenshotUrl required" }, { status: 400 });

  const imgRes = await fetch(screenshotUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");
  const mediaType = "image/jpeg";

  const dataSourceBlocks = await buildDataSourceContent((dataSources || []) as DataSource[]);
  const hasDataSources = dataSourceBlocks.length > 0;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      temperature: 0,
      system: `You are a senior UX, accessibility, CRO, and performance auditor analysing a screenshot of a ${pageName} page on ${device}. Identify the most significant visible issues. For each issue, estimate its position as x/y percentages from the top-left corner of the image (0–100). Be specific about what you can see. Return ONLY valid JSON — no preamble, no markdown:
{
  "findings": [
    { "x": 0-100, "y": 0-100, "category": "UX"|"A11y"|"CRO"|"Perf", "severity": "Critical"|"High"|"Medium"|"Low", "title": "short title", "detail": "what you observe in the screenshot", "recommendation": "specific fix", "hypothesis": "a hypothesis or draft user story for this finding, e.g. \\"We believe [change] for [users] will result in [outcome] because [evidence from the screenshot]\\" or \\"As a [user], I want [goal] so that [benefit]\\"" }
  ]
}
Rules:
- 5–8 findings maximum
- Only include issues visible in the screenshot
- x/y must place the pin near the element with the issue
- hypothesis must be a single sentence, ready to paste into a writeup with no further editing${hasDataSources ? `
- Supporting analytics data sources are provided below (e.g. Google Analytics, Clarity). Where they support or explain a finding, cite the concrete data point in "detail" or "recommendation" (e.g. "GA export shows a 62% bounce rate on this section") and name the source
- Do not fabricate numbers that aren't present in the provided data sources` : ""}
- ONLY output the JSON object`,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Analyse this ${pageName} screenshot (${device}) and return findings JSON.` },
          ...dataSourceBlocks,
        ],
      }],
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "API error" }, { status: res.status });

  const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
  const start = text.indexOf("{"); const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return NextResponse.json({ error: "No JSON in response" }, { status: 500 });

  const parsed = JSON.parse(text.slice(start, end + 1));
  const annotations = (parsed.findings || []).map((f: any, i: number) => ({
    id: genId(),
    number: i + 1,
    x: Math.max(2, Math.min(96, f.x)),
    y: Math.max(2, Math.min(96, f.y)),
    category: f.category,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    recommendation: f.recommendation,
    hypothesis: f.hypothesis || "",
    source: "ai",
  }));

  return NextResponse.json({ annotations });
}
