import { NextRequest, NextResponse } from "next/server";
import { launchBrowser, captureScreenshot } from "@/app/lib/capture";
import { isAuthenticated } from "@/app/lib/auth";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const body = await req.json();
    let url: string = body.url || "";
    const device: "desktop" | "mobile" = body.device === "mobile" ? "mobile" : "desktop";
    if (!url.trim()) return NextResponse.json({ error: "URL required" }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const browser = await launchBrowser();
    let screenshotUrl: string | null;
    try {
      screenshotUrl = await captureScreenshot(browser, url, device, { thorough: true });
    } finally {
      await browser.close().catch(() => {});
    }

    if (!screenshotUrl) return NextResponse.json({ error: "Failed to capture screenshot" }, { status: 500 });
    return NextResponse.json({ url: screenshotUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to capture screenshot" }, { status: 500 });
  }
}
