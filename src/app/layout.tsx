import type { ReactNode } from "react";
import "./globals.css";

/** The real <html>/<body> live in app/[locale]/layout.tsx, which is where the
 *  language and direction are known. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
