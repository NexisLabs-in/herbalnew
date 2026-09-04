import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, live } from "./env";

/** Product image storage on an S3-compatible bucket (S3, R2, Backblaze).
 *
 *  Uploads are **presigned**: the browser PUTs the file straight to the bucket
 *  and the server only ever sees the resulting key. Nothing large passes
 *  through the Node process, which matters on a small VPS.
 *
 *  With `STORAGE_DRIVER=stub` the presign is faked so the admin UI can be built
 *  and demoed before a bucket exists (plan section 3: credentials come later).
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export type UploadTarget = {
  /** Where the browser PUTs the bytes. */
  uploadUrl: string;
  /** Stored on the product; the durable identifier. */
  key: string;
  /** Public URL to render once the upload completes. */
  url: string;
  /** Headers the browser must send for the signature to validate. */
  headers: Record<string, string>;
  stub: boolean;
};

let s3: S3Client | null = null;
function client(): S3Client {
  s3 ??= new S3Client({
    region: env.S3_REGION,
    // R2 and Backblaze need an explicit endpoint; plain AWS derives its own.
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

/** Builds a collision-proof key. The original filename is only kept as a
 *  slugged suffix — user-supplied names are not trusted as paths. */
export function buildKey(prefix: string, filename: string): string {
  const ext = (filename.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "").toLowerCase();
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${prefix}/${randomUUID()}${stem ? `-${stem}` : ""}${ext}`;
}

export function publicUrl(key: string): string {
  if (!live.storage) return `/uploads-stub/${key}`;
  const base = env.S3_PUBLIC_BASE_URL || `${env.S3_ENDPOINT}/${env.S3_BUCKET}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

export async function presignUpload(opts: {
  prefix: string;
  filename: string;
  contentType: string;
  size: number;
}): Promise<UploadTarget> {
  if (!ALLOWED_IMAGE_TYPES.includes(opts.contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error(`Unsupported file type: ${opts.contentType}`);
  }
  if (opts.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  }

  const key = buildKey(opts.prefix, opts.filename);

  if (!live.storage) {
    return { uploadUrl: `/api/uploads/stub?key=${encodeURIComponent(key)}`, key, url: publicUrl(key), headers: {}, stub: true };
  }

  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: opts.contentType,
      // Signing the length stops a signed URL for a thumbnail being reused to
      // upload a gigabyte.
      ContentLength: opts.size,
    }),
    { expiresIn: 60 * 5 },
  );

  return {
    uploadUrl,
    key,
    url: publicUrl(key),
    headers: { "Content-Type": opts.contentType },
    stub: false,
  };
}

export async function deleteObject(key: string): Promise<void> {
  if (!live.storage) {
    console.info(`[storage:stub] would delete ${key}`);
    return;
  }
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
