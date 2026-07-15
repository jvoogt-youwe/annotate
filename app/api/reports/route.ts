import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { launchBrowser, captureScreenshot } from "@/app/lib/capture";
import { isAuthenticated, genId } from "@/app/lib/auth";

export const maxDuration = 240;

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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
    const visible = reports.filter(Boolean);
    return NextResponse.json({
      reports: visible
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
        .map((r: any) => ({ id: r.id, url: r.url, siteName: r.siteName, createdAt: r.createdAt, pages: r.pages?.map((p: any) => ({ id: p.id, name: p.name })) })),
    });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
  const body = await req.json();
  let url: string = body.url || "";
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const id = genId();
  const siteName = new URL(url).hostname.replace(/^www\./, "");

  const browser = await launchBrowser();
  let pages;
  try {
    // Sequential, not concurrent — two thorough captures in parallel contend for the
    // same limited container CPU and end up slower overall than running one at a time.
    const desktopUrl = await captureScreenshot(browser, url, "desktop", { thorough: true });
    const mobileUrl = await captureScreenshot(browser, url, "mobile", { thorough: true });
    pages = [
      desktopUrl && { id: genId(), name: "Homepage", url, device: "desktop", screenshotUrl: desktopUrl, annotations: [] },
      mobileUrl && { id: genId(), name: "Homepage", url, device: "mobile", screenshotUrl: mobileUrl, annotations: [] },
    ].filter((p): p is NonNullable<typeof p> => Boolean(p));
  } finally {
    await browser.close().catch(() => {});
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: "Failed to capture the homepage. Please check the URL and try again." }, { status: 500 });
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
