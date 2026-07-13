<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context: Youwe Annotate

Internal Youwe Agency tool ("UX Annotate") for auditing client websites. A user pastes a client URL; the app captures a homepage screenshot (desktop + mobile) via Puppeteer, uploads it to Vercel Blob, and lets the user add further pages (Category, PDP, etc.) manually, either by screenshotting them the same way or uploading their own image. Screenshots can be sent to Claude (`claude-sonnet-4-6`) for vision analysis on demand, returning UX / Accessibility (A11y) / CRO / Performance findings with an x/y percentage position so the issue can be pinned directly on the screenshot. Findings are compiled into a shareable report.

**Key files:**
- `app/page.tsx` — home page: password gate (`AUDIT_PASSWORD` env var, checked via `x-audit-password` header) + URL input that creates a report (homepage-only capture).
- `app/lib/capture.ts` — shared Puppeteer capture logic (`launchBrowser`, `captureScreenshot`) used by both capture endpoints below. Has a `thorough` mode (longer waits, slower scroll) for single-page captures where there's no multi-page time budget to protect. Any `page.evaluate()` that waits on a browser-side event (image load, etc.) must be wrapped in this file's `withTimeout()` helper — a single stuck resource can otherwise hang the whole capture with no timeout.
- `app/api/reports/route.ts` — creates a report: captures homepage desktop+mobile **sequentially** (not concurrently — two thorough captures in parallel were found in production to contend for CPU and be slower overall than one at a time), returns a 500 if both fail. Also list/fetch of saved reports.
- `app/api/capture-page/route.ts` — on-demand single-page/device capture, used by the "Add new page" modal's "Capture & Add Page" button (also supports checking both Desktop + Mobile to capture both in one go, sequentially).
- `app/api/upload/route.ts` — manual screenshot upload (no Puppeteer) for when a user wants to supply their own image instead of an auto-capture.
- `app/api/ai-findings/route.ts` — per-screenshot Claude vision call, returns findings JSON. User-triggered only (button click), never automatic.
- `app/api/ai-overview/route.ts` — cross-screenshot summary pass. Also user-triggered only.
- `app/api/reports/[id]/route.ts` — fetch/update/delete a single report (delete also removes its screenshots from Blob).
- `app/report/[id]/page.tsx` — renders a report with annotated screenshots.

**Conventions:** styling uses Tailwind CSS v4 (`app/globals.css`, `postcss.config.mjs`), with brand colours registered as `@theme` tokens (`bg-brand-red`, `text-brand-ink`, etc. — see `app/lib/theme.ts` for the matching category/severity color lookups and shared className fragments). Small `style={{...}}` props remain where a value is genuinely data-driven at runtime (e.g. an annotation pin's severity color, drag position, or highlight scale/transform) — that's intentional, not leftover inline styling. `app/report/[id]/page.tsx` is composed from components in `app/components/report/` and `app/components/YouweLogo.tsx`, with shared types in `app/lib/types.ts`. Auth is a single shared team password, not per-user accounts.

**Brand colours:** red `#e40046`, ink `#151515`, blue `#76B4FD`, green `#00c48c`, amber `#f5a623`, offWhite `#f7f7f8`, muted `#9a9a9a`.

**Origin:** this app is the second generation of an earlier internal tool, "youwe-audit," which used Claude's `web_search` tool directly on a URL (no screenshots) and saved results to `localStorage`. This version replaced that with real screenshots, vision-pinned annotations, Blob storage, and a proper reports backend. It originally also auto-detected and captured Category/PLP/PDP/Basket/Checkout pages via an AI web-search call, but that was dropped in favor of homepage-only auto-capture plus manual page-adding, since the variable number of detected pages was causing production timeouts.

**Environment variables:** see `.env.example` for the three required vars (`ANTHROPIC_API_KEY`, `AUDIT_PASSWORD`, `BLOB_READ_WRITE_TOKEN`) — get actual values from a teammate through a secure channel, never via git.

**Hosting:** repo lives on Youwe's GitHub Enterprise instance (`youwe.ghe.com`, EMU-managed org) at `r-tranter/youwe-annotate`. Two gotchas specific to this instance: (1) its **SSH username is `youwe`, not the standard `git`** — using `git@youwe.ghe.com` fails with a misleading "Permission denied (publickey)" even with a correctly-added key; (2) newly-added SSH keys must also be authorized for SSO with the Youwe org (a separate step after adding the key) before they work.

Deployed on Vercel, which also provides the Blob storage in use — **but Vercel's GitHub integration does not support this GHE instance** (confirmed by a hard API error when attempting to connect it), so there is no auto-deploy on push. Deploy manually after pushing: `npx vercel --prod --yes` from the repo root. Multiple team members may run independent Vercel deployments of this repo (each needs the same three env vars set on their own Vercel project) — by design they currently share one Blob store and one Anthropic API key, so all deployments show the same report list and AI usage bills to one account.
