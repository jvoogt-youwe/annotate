import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

function isMasterPassword(password: string): boolean {
  const master = process.env.AUDIT_PASSWORD || "";
  const a = Buffer.from(password);
  const b = Buffer.from(master);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(password: string | null): boolean {
  if (!password) return false;
  return isMasterPassword(password);
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  return checkPassword(req.headers.get("x-audit-password"));
}

export function genId() {
  return Math.random().toString(36).slice(2, 9);
}
