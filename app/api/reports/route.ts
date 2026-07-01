import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { launchBrowser, captureScreenshot } from "@/app/lib/capture";

export const maxDuration = 300;

function auth(req: NextRequest) {
  return req.headers.get("x-audit-password") === process.env.AUDIT_PASSWORD;
}

function genId() { return Math.random().toString(36).slice(2, 9); }

async function detectPages(url: string): Promise<{ name: string; url: string }[]> {
  const pages: { name: string; url: string }[] = [{ name: "Homepage", url }];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        temperature: 0,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Find the URLs for these page types on the given website: Category page, Product Listing Page (PLP), Product Detail Page (PDP), Basket/Cart, Checkout. Return ONLY a JSON array, no preamble: [{"name":"Category","url":"..."},{"name":"PLP","url":"..."},{"name":"PDP","url":"..."},{"name":"Basket","url":"..."},{"name":"Checkout","url":"..."}]. Only include pages you actually find URLs for. Do not invent URLs.`,
        messages: [{ role: "user", content: `Find page URLs for: ${url}` }],
      }),
    });
    const data = await res.json();
    const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
    const start = text.indexOf("["); const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      const found: { name: string; url: string }[] = JSON.parse(text.slice(start, end + 1));
      const seen = new Set([url]);
      for (const p of found) {
        if (p.url && !seen.has(p.url)) { pages.push(p); seen.add(p.url); }
      }
    }
  } catch {}
  return pages;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const { blobs } = await list({ prefix: "reports/", token: process.env.BLOB_READ_WRITE_TOKEN });
    const reports = await Promise.all(
      blobs.map(async b => {
        try {
          const r = await fetch(b.url);
          return r.ok ? await r.json() : null;
        } catch { return null; }
      })
    );
    return NextResponse.json({
      reports: reports
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
        .map((r: any) => ({ id: r.id, url: r.url, siteName: r.siteName, createdAt: r.createdAt, pages: r.pages?.map((p: any) => ({ id: p.id, name: p.name })) })),
    });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
  const body = await req.json();
  let url: string = body.url || "";
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const id = genId();
  const siteName = new URL(url).hostname.replace(/^www\./, "");

  const detectedPages = await detectPages(url);

  const browser = await launchBrowser();
  let pages;
  try {
    // Flatten into one (page, device) task list and cap concurrency — letting every
    // page/device navigate at once starves each tab of CPU until they all time out.
    const tasks = detectedPages.flatMap(p => [
      { page: p, device: "desktop" as const },
      { page: p, device: "mobile" as const },
    ]);
    const CONCURRENCY = 3;
    const captured: (({ id: string; name: string; url: string; device: string; screenshotUrl: string; annotations: never[] }) | null)[] = new Array(tasks.length);
    let next = 0;
    async function worker() {
      while (next < tasks.length) {
        const i = next++;
        const { page: p, device } = tasks[i];
        const screenshotUrl = await captureScreenshot(browser, p.url, device);
        captured[i] = screenshotUrl ? { id: genId(), name: p.name, url: p.url, device, screenshotUrl, annotations: [] } : null;
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
    pages = captured.filter((p): p is NonNullable<typeof p> => p !== null);
  } finally {
    await browser.close().catch(() => {});
  }

  const report = {
    id,
    url,
    siteName,
    createdAt: new Date().toISOString(),
    pages,
  };

  await put(`reports/${id}.json`, JSON.stringify(report), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create report" }, { status: 500 });
  }
}
