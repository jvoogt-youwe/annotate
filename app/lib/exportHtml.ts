import { CAT, SEV } from "./theme";
import type { Report, Page, Annotation } from "./types";

// A bare "www.example.com" has no scheme, so <a href> treats it as a relative
// path instead of navigating offsite — prefix a scheme when missing.
function withProtocol(url: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

export function generateExportHTML(report: Report, shareUrl: string): string {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const totalAnnotations = report.pages.reduce((n: number, p: Page) => n + p.annotations.length, 0);
  const ov = report.overview;
  const overviewSection = (ov?.summary || ov?.keyFindings || ov?.urgentFixes) ? `
    <div class="page-section" style="margin-bottom:28px">
      <div class="page-header"><h2>Report Overview</h2></div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
        ${ov.summary ? `<div><p class="ov-label">Summary</p><p class="ov-text">${ov.summary.replace(/\n/g, "<br>")}</p></div>` : ""}
        ${ov.keyFindings ? `<div><p class="ov-label">Key Findings</p><p class="ov-text">${ov.keyFindings.replace(/\n/g, "<br>")}</p></div>` : ""}
        ${ov.urgentFixes ? `<div><p class="ov-label">Urgent Fixes</p><p class="ov-text" style="border-left:3px solid #e40046;padding-left:12px">${ov.urgentFixes.replace(/\n/g, "<br>")}</p></div>` : ""}
      </div>
    </div>` : "";

  const pagesSections = report.pages.map((page: Page) => {
    const list = page.annotations.map((a: Annotation) => `
      <div class="finding">
        <div class="finding-num" style="background:${SEV[a.severity]?.color || "#e40046"};color:${SEV[a.severity]?.pinText || "#fff"}">${a.number}</div>
        <div class="finding-body">
          <div class="finding-meta">
            <span class="cat" style="color:${CAT[a.category]?.text};background:${CAT[a.category]?.color}18">${CAT[a.category]?.label || a.category}</span>
            <span class="sev" style="color:${SEV[a.severity]?.text}">${a.severity}</span>
          </div>
          <p class="finding-title">${a.title}</p>
          ${a.detail ? `<p class="finding-detail">${a.detail}</p>` : ""}
          ${a.recommendation ? `<p class="finding-rec"><strong>Recommendation:</strong> ${a.recommendation}</p>` : ""}
          ${a.hypothesis ? `<p class="finding-hypothesis"><strong>Hypothesis:</strong> ${a.hypothesis}</p>` : ""}
          ${a.clientNotes ? `<p class="finding-notes"><strong>Client note:</strong> ${a.clientNotes}</p>` : ""}
          ${a.attachments && a.attachments.length > 0 ? `<div class="finding-attachments">${a.attachments.map(att =>
            att.type === "image"
              ? `<a href="${att.url}" target="_blank" rel="noopener noreferrer"><img src="${att.url}" alt="Attachment"/></a>`
              : `<a class="link-attachment" href="${withProtocol(att.url)}" target="_blank" rel="noopener noreferrer">🔗 ${att.label || att.url}</a>`
          ).join("")}</div>` : ""}
        </div>
      </div>`).join("");

    const pins = page.annotations.map((a: Annotation) => `
      <div class="pin" style="left:${a.x}%;top:${a.y}%;background:${SEV[a.severity]?.color || "#e40046"};color:${SEV[a.severity]?.pinText || "#fff"}">${a.number}</div>`).join("");

    return `
      <div class="page-section">
        <div class="page-header">
          <h2>${page.name}</h2>
          <span class="device-badge">${page.device === "desktop" ? "🖥 Desktop" : "📱 Mobile"}</span>
        </div>
        <div class="screenshot-wrap">
          <img src="${page.screenshotUrl}" alt="${page.name}" />
          ${pins}
        </div>
        ${page.annotations.length > 0 ? `<div class="findings-list">${list}</div>` : ""}
      </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>UX Annotation Report — ${report.siteName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f7f7f8;color:#151515}
.page{max-width:1100px;margin:0 auto;padding:40px 32px 80px}
.header{background:#151515;border-radius:16px;padding:36px;margin-bottom:32px}
.meta{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff0451;margin-bottom:8px}
h1{font-size:30px;font-weight:900;color:#fff;letter-spacing:-.02em;margin-bottom:4px}
.url{font-size:14px;color:#76B4FD;display:block;margin-bottom:12px}
.summary-line{font-size:14px;color:#aaa;margin-bottom:6px}
.share{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:16px 24px;margin-bottom:28px}
.page-section{background:#fff;border-radius:12px;border:1px solid #e8e8e8;overflow:hidden;margin-bottom:28px}
.page-header{padding:16px 20px;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:space-between}
.page-header h2{font-size:16px;font-weight:700}
.device-badge{font-size:12px;color:#767676;background:#f7f7f8;padding:4px 10px;border-radius:20px;border:1px solid #e8e8e8}
.screenshot-wrap{position:relative;border-bottom:1px solid #e8e8e8}
.screenshot-wrap img{width:100%;display:block}
.pin{position:absolute;width:28px;height:28px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.findings-list{padding:20px;display:flex;flex-direction:column;gap:12px}
.finding{display:flex;gap:14px;align-items:flex-start}
.finding-num{width:26px;height:26px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.finding-body{flex:1}
.finding-meta{display:flex;gap:8px;align-items:center;margin-bottom:5px}
.cat{font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
.sev{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.finding-title{font-size:14px;font-weight:600;margin-bottom:5px}
.finding-detail{font-size:13px;color:#555;line-height:1.6;margin-bottom:5px}
.finding-rec{font-size:13px;color:#333;line-height:1.6;margin-bottom:5px}
.finding-hypothesis{font-size:13px;color:#555;font-style:italic;line-height:1.6;margin-bottom:5px}
.finding-notes{font-size:13px;color:#7a6000;background:#fffbe6;border-left:3px solid #f0d060;padding:6px 10px;border-radius:0 6px 6px 0;line-height:1.6}
.finding-attachments{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.finding-attachments img{width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #e8e8e8}
.link-attachment{font-size:12px;color:#036eeb;background:#f7f7f8;border:1px solid #e8e8e8;border-radius:6px;padding:6px 10px;text-decoration:none}
.footer{margin-top:48px;padding-top:24px;border-top:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.ov-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#767676;margin-bottom:6px}
.ov-text{font-size:14px;color:#333;line-height:1.7}
@media print{body{background:#fff}.page{padding:20px}}
</style></head><body><div class="page">
<div class="header">
  <p class="meta">UX Annotation Report · ${date}</p>
  <h1>${report.siteName}</h1>
  <a class="url" href="${report.url}">${report.url}</a>
  <p class="summary-line">${report.pages.length} pages · ${totalAnnotations} findings</p>
</div>
${shareUrl ? `<div class="share"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#767676;margin-bottom:4px">Live report link</p><p style="font-size:13px;color:#036eeb;font-family:monospace">${shareUrl}</p></div>` : ""}
${overviewSection}
${pagesSections}
<div class="footer">
  <div style="font-size:18px;font-weight:900;letter-spacing:-.02em">youwe<span style="color:#e40046">.</span></div>
  <div style="font-size:13px;color:#767676">Confidential · Prepared by Youwe Agency · ${date}</div>
</div>
</div></body></html>`;
}
