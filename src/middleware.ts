import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/i18n";

/** Sends bare paths to a locale-prefixed route, honouring Accept-Language. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && isLocale(first)) return NextResponse.next();

  const header = request.headers.get("accept-language") ?? "";
  const preferred = locales.find((l) => header.toLowerCase().startsWith(l)) ?? defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|img|favicon.ico|.*\\..*).*)"],
};
