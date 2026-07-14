import { NextRequest, NextResponse } from "next/server";
import { resolveScopeFromRequest } from "@/app/lib/auth";
import { LEGACY_CLIENT_ID } from "@/app/lib/clients";
import { getJiraConfig, saveJiraConfig, deleteJiraConfig, normalizeSiteUrl } from "@/app/lib/jira";

function canManage(scope: { role: "admin" } | { role: "client"; clientId: string } | null, id: string) {
  return !!scope && (scope.role === "admin" || scope.clientId === id);
}

// GET/PUT/DELETE never return the raw apiToken — only whether a connection exists.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!canManage(scope, id)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const config = await getJiraConfig(id);
  if (!config) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, siteUrl: config.siteUrl, projectKey: config.projectKey });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!canManage(scope, id)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (id === LEGACY_CLIENT_ID) return NextResponse.json({ error: "Cannot configure Jira for the legacy bucket" }, { status: 400 });

  try {
    const { siteUrl, apiToken, projectKey } = await req.json();
    if (!siteUrl?.trim() || !projectKey?.trim()) {
      return NextResponse.json({ error: "siteUrl and projectKey are required" }, { status: 400 });
    }

    const existing = await getJiraConfig(id);
    const token = apiToken?.trim() || existing?.apiToken;
    if (!token) return NextResponse.json({ error: "apiToken required" }, { status: 400 });

    await saveJiraConfig(id, { siteUrl: normalizeSiteUrl(siteUrl), apiToken: token, projectKey: projectKey.trim() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save Jira connection" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!canManage(scope, id)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    await deleteJiraConfig(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to disconnect Jira" }, { status: 500 });
  }
}
