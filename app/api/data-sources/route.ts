import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAuthenticated, genId } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const blob = await put(`data-sources/${genId()}.${file.name.split(".").pop()}`, buffer, {
    access: "public",
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({
    id: genId(),
    name: file.name,
    url: blob.url,
    contentType: file.type,
    uploadedAt: new Date().toISOString(),
  });
}
