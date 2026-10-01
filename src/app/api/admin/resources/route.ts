import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assertSameOrigin, HttpError, jsonError } from "@/lib/http";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("MANAGE_RESOURCES");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1) throw new HttpError(400, "Choose a file to upload.", "FILE_REQUIRED");
    const maxBytes = Math.max(1, Number(process.env.UPLOAD_MAX_BYTES || 20_971_520));
    if (file.size > maxBytes) throw new HttpError(413, "This file is larger than the upload limit.", "FILE_TOO_LARGE");
    if (!allowedMimeTypes.has(file.type)) throw new HttpError(415, "Upload a PDF, PNG, JPEG, WebP, or plain text file.", "FILE_TYPE_NOT_ALLOWED");
    const title = String(form.get("title") || file.name).trim().slice(0, 180);
    if (title.length < 2) throw new HttpError(400, "Give this resource a clear title.", "TITLE_REQUIRED");
    const courseId = String(form.get("courseId") || "").trim() || null;
    const batchId = String(form.get("batchId") || "").trim() || null;
    const { client, bucket } = getStorage();
    const extension = file.name.match(/\.[a-z0-9]{1,10}$/i)?.[0]?.toLowerCase() || "";
    const storageKey = `learning-resources/${randomUUID()}${extension}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: Buffer.from(await file.arrayBuffer()), ContentLength: file.size, ContentType: file.type, ContentDisposition: "attachment", ServerSideEncryption: "AES256" }));
    const resource = await getDb().resource.create({ data: { ownerId: actor.id, title, description: String(form.get("description") || "").trim().slice(0, 1000) || null, storageKey, originalName: file.name.replace(/[\r\n]/g, "_").slice(0, 255), mimeType: file.type, sizeBytes: BigInt(file.size), status: "PUBLISHED", courseId, batchId } });
    return NextResponse.json({ id: resource.id, title: resource.title }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Private object storage is not configured.") return NextResponse.json({ error: "Private object storage is not configured yet.", code: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
    return jsonError(error);
  }
}
