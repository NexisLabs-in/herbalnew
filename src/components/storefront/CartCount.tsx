"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** The number on the basket icon.
 *
 *  Fetched rather than server-rendered, so the cached storefront pages stay
 *  cached — the badge is the only per-visitor thing in the header. It renders
 *  nothing until it knows the answer, because a "0" that flickers to "2" reads
 *  as the basket having just been emptied.
 */
export const CART_CHANGED = "herbedia:cart-changed";

/** Anything that mutates the basket calls this, so the badge follows without
 *  every page needing to know about it. */
export function notifyCartChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CART_CHANGED));
}

export function CartCount() {
  const [count, setCount] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/cart/count", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled) setCount(typeof body.count === "number" ? body.count : 0);
      } catch {
        // Offline or a transient failure — leave the badge as it was.
      }
    };

    load();
    window.addEventListener(CART_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_CHANGED, load);
    };
    // Re-checked on navigation: the basket can change on another tab, and
    // arriving at the cart page should never disagree with the badge.
  }, [pathname]);

  if (!count) return null;

  return (
    <span className="cart-badge" aria-hidden="true">
      {count > 99 ? "99+" : count}
    </span>
  );
}
