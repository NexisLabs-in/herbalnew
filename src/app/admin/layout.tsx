import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import "./admin.css";

/** The admin portal's own document.
 *
 *  Separate from `[locale]/layout.tsx` because the two are genuinely different
 *  applications sharing a codebase: the storefront is bilingual, RTL-aware and
 *  public; the panel is English-only, LTR and behind a login (plan §3). It
 *  reuses the design tokens from globals.css but not the storefront chrome.
 */

const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Herbedia Admin", template: "%s · Herbedia Admin" },
  // Nothing under /admin should ever appear in a search result.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="admin-body">{children}</body>
    </html>
  );
}
