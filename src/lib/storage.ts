import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, live } from "./env";

/** Product image storage, with two drivers behind one interface.
 *
 *  **s3** — the production driver (plan §3). Uploads are *presigned*: the
 *  browser PUTs bytes straight to the bucket and the server only ever sees the
 *  resulting key. Nothing large passes through the Node process, which matters
 *  on a small VPS.
 *
 *  **local** — the default until the client's bucket exists. Writes into
 *  `public/uploads`, so the catalogue can be built and demoed today. The upload
 *  URL is a route on this app rather than a bucket, but the client code is the
 *  same PUT either way, so switching drivers changes an env var and nothing
 *  else. Local files do not survive a container rebuild and are not shared
 *  between instances — fine for one VPS, not a substitute for the bucket.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  // SVG is allowed because the seeded packshots are vectors. It is script-
  // capable, so it is only ever written by an authenticated admin and is served
  // from /uploads, never inlined into a page.
  "image/svg+xml",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type UploadTarget = {
  /** Where the browser PUTs the bytes. */
  uploadUrl: string;
  /** Stored on the product; the durable identifier. */
  key: string;
  /** Public URL to render once the upload completes. */
  url: string;
  /** Headers the browser must send for an S3 signature to validate. */
  headers: Record<string, string>;
  driver: "local" | "s3";
};

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

/** Builds a collision-proof key.
 *
 *  The extension comes from the declared content type, not from the filename —
 *  a name is user input and `photo.jpg.html` must not become an HTML file on
 *  disk. The original stem survives only as a slugged, length-capped suffix so
 *  an admin can still recognise the file. */
export function buildKey(prefix: string, filename: string, contentType: AllowedImageType): string {
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const safePrefix = prefix.replace(/[^a-z0-9/-]/gi, "").replace(/^\/+|\/+$/g, "") || "misc";
  return `${safePrefix}/${randomUUID()}${stem ? `-${stem}` : ""}${EXTENSIONS[contentType]}`;
}

export function publicUrl(key: string): string {
  if (!live.storage) return `/uploads/${key}`;
  const base = `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}`;
  return `${base}/${key}`;
}

export function isAllowedType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

export async function presignUpload(opts: {
  prefix: string;
  filename: string;
  contentType: string;
  size: number;
}): Promise<UploadTarget> {
  if (!isAllowedType(opts.contentType)) {
    throw new Error(`Unsupported file type: ${opts.contentType}`);
  }
  if (opts.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  }

  const key = buildKey(opts.prefix, opts.filename, opts.contentType);

  if (!live.storage) {
    return {
      uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}`,
      key,
      url: publicUrl(key),
      headers: { "Content-Type": opts.contentType },
      driver: "local",
    };
  }

  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: opts.contentType,
      // Signing the length stops a URL signed for a thumbnail being reused to
      // upload a gigabyte.
      ContentLength: opts.size,
    }),
    { expiresIn: 60 * 5 },
  );

  return { uploadUrl, key, url: publicUrl(key), headers: { "Content-Type": opts.contentType }, driver: "s3" };
}

/** Resolves a storage key to a path inside the uploads directory, refusing
 *  anything that escapes it. Keys are generated server-side, but this is the
 *  boundary where a traversal would land, so it is checked here rather than
 *  trusted from the caller. */
export function localPathFor(key: string): string {
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, key);
  const root = path.resolve(LOCAL_UPLOAD_DIR);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function writeLocal(key: string, body: Buffer): Promise<void> {
  const target = localPathFor(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function deleteObject(key: string): Promise<void> {
  if (!live.storage) {
    // Seeded records point at /img/*, which are checked-in assets rather than
    // uploads — deleting a product must not remove them.
    if (!key.startsWith("seed/")) {
      await unlink(localPathFor(key)).catch(() => undefined);
    }
    return;
  }
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
