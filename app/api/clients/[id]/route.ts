import { NextRequest, NextResponse } from "next/server";
import { resolveScopeFromRequest } from "@/app/lib/auth";
import { setClientPassword, renameClient, deleteClientRecord, getClient, LEGACY_CLIENT_ID } from "@/app/lib/clients";
import { reassignAllReports } from "@/app/lib/reports";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!scope) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (scope.role !== "admin" && scope.clientId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (id === LEGACY_CLIENT_ID) return NextResponse.json({ error: "Cannot edit legacy reports' client" }, { status: 400 });

  const { name, password } = await req.json();
  if (!name?.trim() && !password?.trim()) {
    return NextResponse.json({ error: "name or password required" }, { status: 400 });
  }
  if (name?.trim() && !(await renameClient(id, name))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (password?.trim() && !(await setClientPassword(id, password))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!scope || scope.role !== "admin") return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (id === LEGACY_CLIENT_ID) return NextResponse.json({ error: "Cannot delete the legacy bucket" }, { status: 400 });

  const client = await getClient(id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const reassigned = await reassignAllReports(id, LEGACY_CLIENT_ID);
  await deleteClientRecord(id);
  return NextResponse.json({ ok: true, reassigned });
}
