import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness and readiness in one.
 *
 *  Reports the database because a container that answers HTTP while unable to
 *  reach MongoDB is not actually serving anything — it would just fail every
 *  page with a 500 while a naive health check called it healthy.
 */
export async function GET() {
  try {
    await connectDb();
    const ready = mongoose.connection.readyState === 1;
    return NextResponse.json(
      { ok: ready, db: ready ? "connected" : "connecting" },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, db: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
