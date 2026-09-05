import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** What crawlers may read.
 *
 *  Everything private is disallowed explicitly as well as being noindex on the
 *  page itself — belt and braces, since a crawler that ignores one may respect
 *  the other. Quote and invoice links are unguessable but still listed, because
 *  a link pasted into a public place should not become an indexed page.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/en/account",
          "/ar/account",
          "/en/cart",
          "/ar/cart",
          "/en/checkout",
          "/ar/checkout",
          "/en/order",
          "/ar/order",
          "/en/invoice",
          "/ar/invoice",
          "/en/quote",
          "/ar/quote",
          "/en/login",
          "/ar/login",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
