"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT } from "@/content/account";
import { toggleWishlist } from "@/server/actions/account";
import { localePath, t, type Locale } from "@/lib/i18n";

/** Save for later.
 *
 *  The button hydrates itself instead of being told what to show. Passing the
 *  saved state down from the server would make the shop and product pages
 *  render per visitor, and they are the most cacheable pages on the site — one
 *  heart icon is not worth losing that.
 *
 *  A page full of cards must not make a request each: the fetch is shared
 *  through a tiny module-level store, so twelve hearts cost one round trip.
 */

type WishlistState = { signedIn: boolean; ids: Set<string>; loaded: boolean };

let state: WishlistState = { signedIn: false, ids: new Set(), loaded: false };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

function load(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (state.loaded && !force) return Promise.resolve();

  inFlight = fetch("/api/wishlist", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { signedIn: false, ids: [] }))
    .then((body: { signedIn: boolean; ids: string[] }) => {
      state = { signedIn: body.signedIn, ids: new Set(body.ids), loaded: true };
      emit();
    })
    .catch(() => {
      // Offline or a transient failure: the heart stays empty rather than
      // claiming something is saved when it may not be.
      state = { ...state, loaded: true };
      emit();
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Applied immediately on click and corrected by the server's answer. */
function setLocally(productId: string, saved: boolean) {
  const ids = new Set(state.ids);
  if (saved) ids.add(productId);
  else ids.delete(productId);
  state = { ...state, ids };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => state;
const serverSnapshot = (): WishlistState => ({ signedIn: false, ids: new Set(), loaded: false });

export function WishlistButton({
  productId,
  locale,
  returnTo,
  variant = "icon",
}: {
  productId: string;
  locale: Locale;
  /** Where to come back to after signing in. */
  returnTo: string;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const store = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const saved = store.ids.has(productId);
  const label = saved ? t(ACCOUNT.savedItem, locale) : t(ACCOUNT.saveItem, locale);

  const onClick = () => {
    // A signed-out visitor is sent to log in rather than told off: wanting to
    // save something is a good moment to make an account, and the redirect
    // brings them back to the product they were looking at.
    if (store.loaded && !store.signedIn) {
      router.push(`${localePath(locale, "/login")}?next=${encodeURIComponent(returnTo)}`);
      return;
    }

    const next = !saved;
    setLocally(productId, next);
    setFailed(false);

    start(async () => {
      const result = await toggleWishlist(productId);
      if (result.error) {
        setLocally(productId, !next);
        if (result.error === "sign_in") {
          router.push(`${localePath(locale, "/login")}?next=${encodeURIComponent(returnTo)}`);
        } else {
          setFailed(true);
        }
        return;
      }
      if (typeof result.saved === "boolean") setLocally(productId, result.saved);
      router.refresh();
    });
  };

  return (
    <button
      className={`wish${saved ? " is-saved" : ""}${variant === "full" ? " wish--full" : ""}`}
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={failed ? "That did not save. Try again." : label}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5 3.8 12.3a5 5 0 0 1 7-7.1l1.2 1.1 1.2-1.1a5 5 0 1 1 7 7.1z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {variant === "full" ? <span>{label}</span> : null}
    </button>
  );
}
