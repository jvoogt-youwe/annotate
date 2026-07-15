import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { isAuthenticated } from "@/app/lib/auth";
import { getJiraConfig, createJiraIssue, buildJiraDescription } from "@/app/lib/jira";

async function findReportBlob(id: string) {
  const { blobs } = await list({ prefix: `reports/${id}.json`, token: process.env.BLOB_READ_WRITE_TOKEN });
  return blobs[0] ?? null;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { reportId, pageId, annotationIds, shareUrl } = await req.json();
  if (!reportId || !pageId || !Array.isArray(annotationIds) || annotationIds.length === 0) {
    return NextResponse.json({ error: "reportId, pageId and annotationIds required" }, { status: 400 });
  }

  const blob = await findReportBlob(reportId);
  if (!blob) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const report = await (await fetch(blob.url)).json();

  const config = await getJiraConfig();
  if (!config) return NextResponse.json({ error: "Jira isn't connected yet — set it up in Report settings." }, { status: 400 });

  const page = report.pages.find((p: any) => p.id === pageId);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const results: { annotationId: string; ok: boolean; jiraKey?: string; jiraUrl?: string; error?: string }[] = [];

  for (const annotationId of annotationIds) {
    const annotation = page.annotations.find((a: any) => a.id === annotationId);
    if (!annotation) { results.push({ annotationId, ok: false, error: "Finding not found" }); continue; }
    if (annotation.jiraKey) { results.push({ annotationId, ok: true, jiraKey: annotation.jiraKey, jiraUrl: annotation.jiraUrl }); continue; }
    try {
      const description = buildJiraDescription(annotation, page, shareUrl || report.url);
      const { key, url } = await createJiraIssue(config, annotation.title, description);
      annotation.jiraKey = key;
      annotation.jiraUrl = url;
      results.push({ annotationId, ok: true, jiraKey: key, jiraUrl: url });
    } catch (e: any) {
      results.push({ annotationId, ok: false, error: e.message || "Failed to create Jira issue" });
    }
  }

  await put(`reports/${reportId}.json`, JSON.stringify(report), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });

  return NextResponse.json({ results });
}
