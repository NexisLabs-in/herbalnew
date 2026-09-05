import type { ReactNode } from "react";
import "./globals.css";
import { bootOnce } from "@/lib/jobs/boot";

// Registers the scheduled jobs on the first render of the server process.
// See `bootOnce` for why this is not in instrumentation.ts.
bootOnce();

/** The real <html>/<body> live in app/[locale]/layout.tsx, which is where the
 *  language and direction are known. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
