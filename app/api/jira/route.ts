import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/app/lib/auth";
import { getJiraConfig, saveJiraConfig, deleteJiraConfig, normalizeSiteUrl } from "@/app/lib/jira";

// GET/PUT/DELETE never return the raw apiToken — only whether a connection exists.
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const config = await getJiraConfig();
  if (!config) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, siteUrl: config.siteUrl, projectKey: config.projectKey });
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { siteUrl, apiToken, projectKey } = await req.json();
    if (!siteUrl?.trim() || !projectKey?.trim()) {
      return NextResponse.json({ error: "siteUrl and projectKey are required" }, { status: 400 });
    }

    const existing = await getJiraConfig();
    const token = apiToken?.trim() || existing?.apiToken;
    if (!token) return NextResponse.json({ error: "apiToken required" }, { status: 400 });

    await saveJiraConfig({ siteUrl: normalizeSiteUrl(siteUrl), apiToken: token, projectKey: projectKey.trim() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save Jira connection" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    await deleteJiraConfig();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to disconnect Jira" }, { status: 500 });
  }
}
