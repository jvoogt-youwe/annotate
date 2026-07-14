import { NextRequest, NextResponse } from "next/server";
import { resolveScope } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const scope = await resolveScope(password || null);
  if (!scope) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  return NextResponse.json(scope);
}
