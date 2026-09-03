import Link from "next/link";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";
import { BRAND } from "@/content/brand";
import { defaultLocale, localePath, t } from "@/lib/i18n";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

/**
 * The root layout is a pass-through so that [locale]/layout.tsx can own <html>
 * and set lang/dir. This page therefore has to supply the document itself.
 *
 * "Page not found" and the button label are the only strings on the site that
 * are not transcribed from the live pages — there is no upstream 404 to copy.
 */
export default function NotFound() {
  return (
    <html lang={defaultLocale} dir="ltr" className={`${newsreader.variable} ${grotesk.variable}`}>
      <body>
        <main
          style={{
            minHeight: "100svh", display: "grid", placeItems: "center",
            textAlign: "center", padding: "var(--gutter)",
            background:
              "radial-gradient(96% 74% at 50% 0%, rgba(81,43,199,.28), transparent 64%)," +
              "linear-gradient(165deg, var(--color-shade-900), var(--color-shade-950))",
            color: "var(--color-paper-100)",
          }}
        >
          <div>
            <p className="eyebrow eyebrow--center">{t(BRAND.tagline, defaultLocale)}</p>
            <p
              className="display"
              style={{ fontSize: "clamp(4rem,14vw,8rem)", color: "var(--color-violet-300)", marginTop: "1rem" }}
            >
              404
            </p>
            <h1 className="display d3" style={{ color: "var(--color-paper-50)", marginTop: ".5rem" }}>
              Page not found
            </h1>
            <p style={{ color: "rgba(240,237,251,.72)", marginTop: "1rem" }}>
              {t(BRAND.supporting, defaultLocale)}
            </p>
            <Link className="btn btn--brand" style={{ marginTop: "2rem" }} href={localePath(defaultLocale)}>
              {BRAND.name} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
