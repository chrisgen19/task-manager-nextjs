import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import { UPLOAD_MAX_SIZE, UPLOAD_ALLOWED_TYPES } from "@/schemas";

const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

  let buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;
  let filename = file.name;

  // Compress raster images to WebP
  if (COMPRESSIBLE_TYPES.has(file.type)) {
    buffer = Buffer.from(await sharp(buffer).webp({ quality: 80 }).toBuffer());
    contentType = "image/webp";
    filename = filename.replace(/\.[^.]+$/, ".webp");
  }

  const key = generateFileKey(session.user.id, filename);
  const url = await uploadToR2(buffer, key, contentType);

  // Record unlinked attachment — taskId/commentId set by save routes
  await db.attachment.create({
    data: {
      r2Key: key,
      url,
      filename,
      contentType,
      size: buffer.length,
      userId: session.user.id,
    },
  });

  return NextResponse.json({
    url,
    filename,
    contentType,
    size: buffer.length,
  });
}
