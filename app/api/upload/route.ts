import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

function genId() { return Math.random().toString(36).slice(2, 9); }

export async function POST(req: NextRequest) {
  const password = req.headers.get("x-audit-password");
  if (password !== process.env.AUDIT_PASSWORD) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  const buffer = await file.arrayBuffer();
  const blob = await put(`screenshots/${genId()}.${file.name.split(".").pop()}`, buffer, {
    access: "public",
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return NextResponse.json({ url: blob.url });
}
