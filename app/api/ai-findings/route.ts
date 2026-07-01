import { NextRequest, NextResponse } from "next/server";

function auth(req: NextRequest) {
  return req.headers.get("x-audit-password") === process.env.AUDIT_PASSWORD;
}

function genId() { return Math.random().toString(36).slice(2, 9); }

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { screenshotUrl, pageName, device } = await req.json();
  if (!screenshotUrl) return NextResponse.json({ error: "screenshotUrl required" }, { status: 400 });

  const imgRes = await fetch(screenshotUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");
  const mediaType = "image/jpeg";

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
    { "x": 0-100, "y": 0-100, "category": "UX"|"A11y"|"CRO"|"Perf", "severity": "Critical"|"High"|"Medium"|"Low", "title": "short title", "detail": "what you observe in the screenshot", "recommendation": "specific fix" }
  ]
}
Rules:
- 5–8 findings maximum
- Only include issues visible in the screenshot
- x/y must place the pin near the element with the issue
- ONLY output the JSON object`,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Analyse this ${pageName} screenshot (${device}) and return findings JSON.` },
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
    source: "ai",
  }));

  return NextResponse.json({ annotations });
}
