<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context: Youwe Annotate

Internal Youwe Agency tool ("UX Annotate") for auditing client websites. A user pastes a client URL; the app uses Puppeteer to screenshot key page types (homepage, category/listing, product/checkout), uploads the screenshots to Vercel Blob, then sends each screenshot to Claude (`claude-sonnet-4-6`) for vision analysis. Claude returns UX / Accessibility (A11y) / CRO / Performance findings, each with an x/y percentage position so the issue can be pinned directly on the screenshot. Findings are compiled into a shareable report.

**Key files:**
- `app/page.tsx` — home page: password gate (`AUDIT_PASSWORD` env var, checked via `x-audit-password` header) + URL input that kicks off a run.
- `app/api/upload/route.ts` — screenshot capture/upload pipeline (Puppeteer + Vercel Blob).
- `app/api/ai-findings/route.ts` — per-screenshot Claude vision call, returns findings JSON.
- `app/api/ai-overview/route.ts` — cross-screenshot summary pass.
- `app/api/reports/route.ts` + `app/api/reports/[id]/route.ts` — create/list/fetch saved reports.
- `app/report/[id]/page.tsx` — renders a report with annotated screenshots.

**Conventions:** all styling is inline React style objects (no CSS framework). Auth is a single shared team password, not per-user accounts.

**Brand colours:** red `#e40046`, ink `#151515`, blue `#76B4FD`, green `#00c48c`, amber `#f5a623`, offWhite `#f7f7f8`, muted `#9a9a9a`.

**Origin:** this app is the second generation of an earlier internal tool, "youwe-audit," which used Claude's `web_search` tool directly on a URL (no screenshots) and saved results to `localStorage`. This version replaced that with real screenshots, vision-pinned annotations, Blob storage, and a proper reports backend.

**Hosting:** repo lives on Youwe's GitHub Enterprise instance (`youwe.ghe.com`, EMU-managed org) at `r-tranter/youwe-annotate`. Deployment target is Vercel (which also provides the Blob storage already in use), connected to this repo for auto-deploy on push.
