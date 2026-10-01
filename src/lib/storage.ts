import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

export function getStorage() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_REGION) {
    throw new Error("Private object storage is not configured.");
  }
  client ??= new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  });
  return { client, bucket };
}

export async function createResourceDownloadUrl(storageKey: string, originalName: string): Promise<string> {
  const { client: storage, bucket } = getStorage();
  const safeName = originalName.replace(/[\r\n"\\]/g, "_").slice(0, 180);
  return getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: storageKey, ResponseContentDisposition: `attachment; filename="${safeName}"` }), { expiresIn: 120 });
}
