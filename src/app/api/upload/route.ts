import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import { UPLOAD_MAX_SIZE, UPLOAD_ALLOWED_TYPES } from "@/schemas";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > UPLOAD_MAX_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10MB limit" },
      { status: 400 },
    );
  }

  if (!UPLOAD_ALLOWED_TYPES.includes(file.type as (typeof UPLOAD_ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = generateFileKey(session.user.id, file.name);
  const url = await uploadToR2(buffer, key, file.type);

  return NextResponse.json({
    url,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
}
