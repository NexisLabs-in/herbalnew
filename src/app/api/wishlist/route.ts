import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/auth/guards";

/** What the signed-in customer has saved.
 *
 *  Fetched by the wishlist buttons rather than rendered into the page, for the
 *  same reason as the basket badge: the shop and product pages are the most
 *  visited and the most cacheable, and making them render per request for one
 *  heart icon is a poor trade. This is the only per-visitor bit, so this is the
 *  only thing fetched.
 */
export async function GET() {
  try {
    const customer = await getCustomer();
    return NextResponse.json(
      {
        signedIn: Boolean(customer),
        ids: (customer?.wishlist ?? []).map((id) => String(id)),
      },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return NextResponse.json(
      { signedIn: false, ids: [] },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
