import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Amiri, IBM_Plex_Sans_Arabic, JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { BRAND, UI } from "@/content/brand";
import { HERO } from "@/content/pages";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { dir, isLocale, locales, t, type Locale } from "@/lib/i18n";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});
const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});
const monoData = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
  display: "swap",
});
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-ar",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: {
      default: `${BRAND.name} — ${t(BRAND.slogan, locale)}`,
      template: `%s · ${BRAND.name}`,
    },
    description: t(HERO.desc, locale),
    // favicon.ico (the wordmark H) is picked up from src/app automatically;
    // the fern only resolves at larger sizes, so it serves as the touch icon.
    icons: { apple: "/brand/app-icon.png" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const fonts = [newsreader, grotesk, monoData, amiri, plexArabic]
    .map((f) => f.variable)
    .join(" ");

  return (
    <html lang={locale} dir={dir(locale)} className={fonts}>
      <head>
        {/* Reveal-on-scroll is JS-driven; without it the content must still be
            visible, so the hidden state is lifted when scripts do not run. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1;transform:none}"}</style>
        </noscript>
      </head>
      <body>
        <a className="skip" href="#main">
          {t(UI.skipToContent, locale)}
        </a>
        <Header locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
