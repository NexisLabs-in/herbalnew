import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifyAdminToken, verifyCustomerToken } from "@/lib/auth/tokens";
import { defaultLocale, isLocale, locales } from "@/lib/i18n";

/** Locale routing plus a first gate on protected routes.
 *
 *  The middleware runs on the Edge runtime and cannot reach MongoDB, so it
 *  verifies the session cookie's signature and nothing more. That is enough to
 *  bounce signed-out visitors before a page renders; whether the account still
 *  exists, is active, and holds the right permission is decided by the guards
 *  in `@/lib/auth/guards` on the server. This is a fast filter, not the lock.
 */

const ADMIN_PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password"];

/** Storefront areas that require a customer session. Checked after the locale
 *  segment is stripped. */
const CUSTOMER_PREFIXES = ["/account", "/checkout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin: never locale-prefixed, English only ---------------------------
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (ADMIN_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.next();
    }
    const session = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Storefront: send bare paths to a locale, honouring Accept-Language ----
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (!first || !isLocale(first)) {
    const header = request.headers.get("accept-language") ?? "";
    const preferred = locales.find((l) => header.toLowerCase().startsWith(l)) ?? defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const rest = `/${segments.slice(1).join("/")}`;
  if (CUSTOMER_PREFIXES.some((prefix) => rest === prefix || rest.startsWith(`${prefix}/`))) {
    const session = await verifyCustomerToken(request.cookies.get(CUSTOMER_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = `/${first}/login`;
      // Carries the shopper back to where they were headed — a checkout
      // interrupted by a login should resume, not restart.
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // `api` and `uploads` are excluded deliberately: without that, the locale
  // rule below rewrites /api/uploads/presign to /en/api/uploads/presign and
  // every API call becomes a redirect. Route handlers do their own auth.
  matcher: ["/((?!api|_next|img|brand|uploads|favicon.ico|.*\\..*).*)"],
};
