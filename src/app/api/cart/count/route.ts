import { NextResponse } from "next/server";
import { cartItemCount } from "@/lib/cart";

/** How many items are in the visitor's basket.
 *
 *  A route handler rather than a layout read: the layout renders on every page,
 *  including the statically cached shop and product pages, and reading a cookie
 *  there would make the whole storefront render per request. The badge is the
 *  only per-visitor thing in the header, so it is the only thing fetched.
 */
export async function GET() {
  try {
    const count = await cartItemCount();
    return NextResponse.json(
      { count },
      // Per-visitor and changes on every add — never cached, by us or a proxy.
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    // A basket badge is not worth a 500 on every page; fail to zero.
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store, private" } });
  }
}
