import { put } from "@vercel/blob";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const LOCAL_CHROME_PATH =
  process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" :
  process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" :
  "/usr/bin/google-chrome";

// Concurrent captureScreenshot() calls each independently trigger chromium's
// /tmp binary extraction, which races and fails with ETXTBSY. Resolve it once
// per container and let every launch reuse the same path.
let chromiumExecutablePath: Promise<string> | null = null;
function getChromiumExecutablePath() {
  if (!chromiumExecutablePath) chromiumExecutablePath = chromium.executablePath();
  return chromiumExecutablePath;
}

export async function launchBrowser() {
  return puppeteer.launch(
    process.env.VERCEL
      ? { args: chromium.args, executablePath: await getChromiumExecutablePath(), headless: true }
      : { executablePath: LOCAL_CHROME_PATH, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
  );
}

async function dismissCookieBanners(page: import("puppeteer-core").Page) {
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
  ` }).catch(() => {});

  await page.evaluate(() => {
    // Try clicking accept first
    const keywords = ["accept all", "accept cookies", "allow all", "allow cookies", "i agree", "agree to all", "got it", "ok, i agree"];
    const els = Array.from(document.querySelectorAll("button, a, [role=button], div, span")) as HTMLElement[];
    const btn = els.find(el => el.children.length === 0 && keywords.some(k => el.innerText?.toLowerCase().trim().startsWith(k)));
    if (btn) btn.click();

    // Remove any remaining fixed/absolute elements with a semi-transparent or dark background
    // that look like overlays (z-index > 50, covers most of the screen)
    document.querySelectorAll<HTMLElement>("body > *, body > * > *, body > * > * > *").forEach(el => {
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
}

function genId() { return Math.random().toString(36).slice(2, 9); }

// page.evaluate() calls that wait on browser-side events (image onload/onerror) can hang
// forever if a single image never fires either event — race against a timeout so one
// stuck resource can't block the whole capture.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>(resolve => setTimeout(() => {
      console.error(`${label} timed out after ${ms}ms, proceeding anyway`);
      resolve(undefined);
    }, ms)),
  ]);
}

export async function captureScreenshot(browser: import("puppeteer-core").Browser, url: string, device: "desktop" | "mobile", options?: { thorough?: boolean }): Promise<string | null> {
  // "thorough" trades speed for completeness — used for single-page captures where
  // there's no multi-page time budget to protect, so slow third-party widgets
  // (reviews, embeds) and scroll-triggered lazy loaders get more time to settle.
  const thorough = options?.thorough ?? false;
  const width = device === "desktop" ? 1440 : 390;
  const height = device === "desktop" ? 900 : 844;
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width, height, isMobile: device === "mobile" });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // 1. Remove cookie banners, overlays and restore scroll (some consent widgets mount
    // a beat after networkidle, so wait briefly before the first dismiss attempt)
    await new Promise(r => setTimeout(r, thorough ? 1500 : 800));
    await dismissCookieBanners(page);
    await new Promise(r => setTimeout(r, thorough ? 600 : 400));

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

    // 4. Scroll down slowly to trigger any remaining lazy load listeners — thorough mode
    // dwells at each step so IntersectionObserver-based loaders and async widgets have
    // time to fire before we scroll past them
    await withTimeout(page.evaluate(async (stepSize: number, intervalMs: number) => {
      await new Promise<void>(resolve => {
        let pos = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, stepSize);
          pos += stepSize;
          if (pos >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, intervalMs);
      });
    }, thorough ? 400 : 600, thorough ? 250 : 70), 15000, "scroll pass");

    // 5. Wait for images to finish loading (bounded — a single stuck image shouldn't
    // hang the whole capture)
    await withTimeout(page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
    }).catch(() => {}), 8000, "image load wait");

    // Extra settle time for slow-rendering third-party widgets (reviews, embeds) that
    // fetch and inject content asynchronously after becoming visible
    if (thorough) await new Promise(r => setTimeout(r, 2000));

    await new Promise(r => setTimeout(r, thorough ? 700 : 500));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, thorough ? 500 : 300));

    // 6. Second dismiss pass, in case a banner mounted late during image/scroll steps
    await dismissCookieBanners(page);

    const buffer = Buffer.from(await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 }));
    await page.close();

    const blob = await put(`screenshots/${genId()}.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  } catch (e) {
    console.error(`captureScreenshot failed for ${url} (${device}):`, e);
    if (page) await page.close().catch(() => {});
    return null;
  }
}
