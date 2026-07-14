import { NextRequest, NextResponse } from "next/server";
import { resolveScopeFromRequest } from "@/app/lib/auth";
import { getClient, LEGACY_CLIENT_ID } from "@/app/lib/clients";
import { setReportClient } from "@/app/lib/reports";

// Admin-only: move a single report to a different client (or back to Legacy).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!scope || scope.role !== "admin") return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  if (clientId !== LEGACY_CLIENT_ID && !(await getClient(clientId))) {
    return NextResponse.json({ error: "Unknown client" }, { status: 400 });
  }

  const ok = await setReportClient(id, clientId);
  if (!ok) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
