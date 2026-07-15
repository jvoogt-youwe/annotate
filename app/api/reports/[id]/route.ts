import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { isAuthenticated } from "@/app/lib/auth";

async function findReportBlob(id: string) {
  const { blobs } = await list({ prefix: `reports/${id}.json`, token: process.env.BLOB_READ_WRITE_TOKEN });
  return blobs[0] ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const blob = await findReportBlob(id);
    if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const res = await fetch(blob.url);
    const report = await res.json();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// PATCH — unauthenticated, only updates clientNotes on a specific annotation
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { pageId, annotationId, clientNotes } = await req.json();
    if (!pageId || !annotationId) return NextResponse.json({ error: "pageId and annotationId required" }, { status: 400 });

    const blob = await findReportBlob(id);
    if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const res = await fetch(blob.url);
    const report = await res.json();

    const pages = report.pages.map((p: any) => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        annotations: p.annotations.map((a: any) =>
          a.id === annotationId ? { ...a, clientNotes } : a
        ),
      };
    });

    await put(`reports/${id}.json`, JSON.stringify({ ...report, pages }), {
      access: "public",
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  try {
    const blob = await findReportBlob(id);
    if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const res = await fetch(blob.url);
    const report = await res.json();
    const screenshotUrls = (report.pages || []).map((p: any) => p.screenshotUrl).filter(Boolean);

    await del([blob.url, ...screenshotUrls], { token: process.env.BLOB_READ_WRITE_TOKEN });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete report" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  try {
    const blob = await findReportBlob(id);
    if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    await put(`reports/${id}.json`, JSON.stringify(body), {
      access: "public",
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
