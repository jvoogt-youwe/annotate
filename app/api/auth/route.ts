import { NextRequest, NextResponse } from "next/server";
import { checkPassword } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!checkPassword(password || null)) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
