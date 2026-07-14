import { NextRequest, NextResponse } from "next/server";
import { resolveScopeFromRequest } from "@/app/lib/auth";
import { listClients, createClient, LEGACY_CLIENT_ID, LEGACY_CLIENT_NAME } from "@/app/lib/clients";

export async function GET(req: NextRequest) {
  const scope = await resolveScopeFromRequest(req);
  if (!scope || scope.role !== "admin") return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const clients = await listClients();
  return NextResponse.json({
    clients: [
      { id: LEGACY_CLIENT_ID, name: LEGACY_CLIENT_NAME, createdAt: null, isLegacy: true },
      ...clients.map(c => ({ id: c.id, name: c.name, createdAt: c.createdAt })),
    ],
  });
}

export async function POST(req: NextRequest) {
  const scope = await resolveScopeFromRequest(req);
  if (!scope || scope.role !== "admin") return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { name, password } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const { client, password: plainPassword } = await createClient(name, password);
  return NextResponse.json({ client: { id: client.id, name: client.name, createdAt: client.createdAt }, password: plainPassword });
}
