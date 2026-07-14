import { put, list } from "@vercel/blob";

async function listAllReportsRaw(): Promise<any[]> {
  const { blobs } = await list({ prefix: "reports/", token: process.env.BLOB_READ_WRITE_TOKEN });
  const reports = await Promise.all(
    blobs.map(async b => {
      try {
        const r = await fetch(b.url, { cache: "no-store" });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    })
  );
  return reports.filter(Boolean);
}

async function saveReportClientId(report: any, clientId: string) {
  await put(`reports/${report.id}.json`, JSON.stringify({ ...report, clientId }), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });
}

// Used when deleting a client — reassigns all of its reports rather than orphaning them.
export async function reassignAllReports(fromClientId: string, toClientId: string): Promise<number> {
  const reports = await listAllReportsRaw();
  const affected = reports.filter(r => (r.clientId || "legacy") === fromClientId);
  await Promise.all(affected.map(r => saveReportClientId(r, toClientId)));
  return affected.length;
}

// Used to move a single report to a different client.
export async function setReportClient(id: string, clientId: string): Promise<boolean> {
  const reports = await listAllReportsRaw();
  const report = reports.find(r => r.id === id);
  if (!report) return false;
  await saveReportClientId(report, clientId);
  return true;
}
