import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { verifyClientPassword, LEGACY_CLIENT_ID } from "./clients";

export type Scope =
  | { role: "admin" }
  | { role: "client"; clientId: string; clientName: string };

function isMasterPassword(password: string): boolean {
  const master = process.env.AUDIT_PASSWORD || "";
  const a = Buffer.from(password);
  const b = Buffer.from(master);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function resolveScope(password: string | null): Promise<Scope | null> {
  if (!password) return null;
  if (isMasterPassword(password)) return { role: "admin" };
  const client = await verifyClientPassword(password);
  if (client) return { role: "client", clientId: client.id, clientName: client.name };
  return null;
}

export async function resolveScopeFromRequest(req: NextRequest): Promise<Scope | null> {
  return resolveScope(req.headers.get("x-audit-password"));
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  return (await resolveScopeFromRequest(req)) !== null;
}

export function canAccessReport(scope: Scope, report: { clientId?: string }): boolean {
  if (scope.role === "admin") return true;
  return scope.clientId === (report.clientId || LEGACY_CLIENT_ID);
}

export function genId() {
  return Math.random().toString(36).slice(2, 9);
}
