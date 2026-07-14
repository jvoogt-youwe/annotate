import { NextRequest, NextResponse } from "next/server";
import { resolveScopeFromRequest } from "@/app/lib/auth";
import { resetClientPassword, LEGACY_CLIENT_ID } from "@/app/lib/clients";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await resolveScopeFromRequest(req);
  if (!scope || scope.role !== "admin") return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (id === LEGACY_CLIENT_ID) return NextResponse.json({ error: "Cannot reset the password for legacy reports" }, { status: 400 });

  const result = await resetClientPassword(id);
  if (!result) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json(result);
}
