import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { MAX_UPLOAD_BYTES, presignUpload } from "@/lib/storage";

/** Hands the browser a place to upload an image to.
 *
 *  A route handler rather than a server action because the browser needs the
 *  URL back before it starts sending bytes. Admin-only and permission-checked:
 *  an open presign endpoint is an open write to your bucket.
 */

const schema = z.object({
  prefix: z.enum(["products", "categories", "content"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin.permissions, "products:write")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await presignUpload(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload could not be prepared" },
      { status: 400 },
    );
  }
}
