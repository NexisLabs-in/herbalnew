import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { isAllowedType, MAX_UPLOAD_BYTES, publicUrl, writeLocal } from "@/lib/storage";

/** Receives an upload when the local storage driver is in use.
 *
 *  This is what stands in for a presigned S3 PUT before the client's bucket
 *  exists. It takes the same request the browser would send to S3 — a raw PUT
 *  with a Content-Type — so switching to the bucket needs no client change.
 *
 *  Every check S3 would enforce through the signature is enforced here instead:
 *  who is asking, what type, and how big.
 */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin.permissions, "products:write")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const contentType = request.headers.get("content-type") ?? "";
  if (!isAllowedType(contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 415 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.byteLength === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  try {
    await writeLocal(key, body);
  } catch (error) {
    console.error("[uploads] local write failed", error);
    return NextResponse.json({ error: "Could not save the file" }, { status: 500 });
  }

  return NextResponse.json({ key, url: publicUrl(key) });
}
