import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import puppeteer from "puppeteer";

function auth(req: NextRequest) {
  return req.headers.get("x-audit-password") === process.env.AUDIT_PASSWORD;
}

function genId() { return Math.random().toString(36).slice(2, 9); }

async function captureScreenshot(url: string, device: "desktop" | "mobile"): Promise<string | null> {
  const width = device === "desktop" ? 1440 : 390;
  const height = device === "desktop" ? 900 : 844;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width, height, isMobile: device === "mobile" });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // 1. Remove cookie banners, overlays and restore scroll
    await page.addStyleTag({ content: `
      #onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk,
      #CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay,
      .cookielaw-icon, #cookie-notice, .cookie-notice,
      .cookie-banner, .cookie-consent, .cookie-bar,
      .cc-window, .cc-banner, #cc-main,
      [id*="cookie-consent"], [class*="cookie-consent"],
      [id*="cookie-banner"], [class*="cookie-banner"],
      [id*="cookie-overlay"], [class*="cookie-overlay"],
      #hs-eu-cookie-confirmation, .hs-cookie-notification-position-bottom,
      [class*="CookieBanner"], [id*="CookieBanner"],
      [class*="consent-banner"], [id*="consent-banner"],
      .evidon-banner, .truste_overlay, .truste_box_overlay { display: none !important; }
      body, html { overflow: auto !important; }
    ` });

    // 2. Remove any remaining fixed overlays (dark backgrounds left behind by cookie banners)
    await page.evaluate(() => {
      // Try clicking accept first
      const keywords = ["accept all", "accept cookies", "allow all", "allow cookies", "i agree", "agree to all", "got it", "ok, i agree"];
      const els = Array.from(document.querySelectorAll("button, a, [role=button]")) as HTMLElement[];
      const btn = els.find(el => keywords.some(k => el.innerText?.toLowerCase().trim().startsWith(k)));
      if (btn) btn.click();

      // Remove any fixed/absolute elements with a semi-transparent or dark background
      // that look like overlays (z-index > 50, covers most of the screen)
      document.querySelectorAll<HTMLElement>("body > *, body > * > *").forEach(el => {
        const s = window.getComputedStyle(el);
        const zIndex = parseInt(s.zIndex) || 0;
        const bg = s.backgroundColor;
        const pos = s.position;
        const isOverlay = (pos === "fixed" || pos === "absolute") && zIndex > 50;
        const isDark = bg.includes("rgba") && bg.includes("0, 0, 0") && !bg.includes("rgba(0, 0, 0, 0)");
        if (isOverlay && isDark) el.remove();
      });

      // Restore body scroll in case the banner locked it
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 600));

    // 3. Force lazy images to load by setting src from data attributes
    await page.evaluate(() => {
      document.querySelectorAll<HTMLImageElement>("img").forEach(img => {
        const lazy = img.dataset.src || img.dataset.lazySrc || img.dataset.originalSrc || img.getAttribute("data-lazy");
        if (lazy) img.src = lazy;
        img.loading = "eager";
      });
      // Also trigger lazily loaded background images via Intersection Observer workaround
      document.querySelectorAll<HTMLElement>("[data-bg], [data-background]").forEach(el => {
        const bg = el.dataset.bg || el.dataset.background;
        if (bg) el.style.backgroundImage = `url(${bg})`;
      });
    }).catch(() => {});

    // 4. Scroll down slowly to trigger any remaining lazy load listeners
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        const step = 400;
        let pos = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          pos += step;
          if (pos >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // 5. Wait for images to finish loading
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 800));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 400));

    const buffer = Buffer.from(await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 }));
    await browser.close();

    const blob = await put(`screenshots/${genId()}.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

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

  const pages = await Promise.all(
    detectedPages.map(async p => {
      const [desktopUrl, mobileUrl] = await Promise.all([
        captureScreenshot(p.url, "desktop"),
        captureScreenshot(p.url, "mobile"),
      ]);
      const result = [];
      if (desktopUrl) result.push({ id: genId(), name: p.name, url: p.url, device: "desktop", screenshotUrl: desktopUrl, annotations: [] });
      if (mobileUrl) result.push({ id: genId(), name: p.name, url: p.url, device: "mobile", screenshotUrl: mobileUrl, annotations: [] });
      return result;
    })
  );

  const report = {
    id,
    url,
    siteName,
    createdAt: new Date().toISOString(),
    pages: pages.flat(),
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
