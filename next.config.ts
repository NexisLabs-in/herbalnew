import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /** Mongoose and the MongoDB driver reach for `net`, `child_process` and
   *  friends, which cannot be bundled — the Edge build of `instrumentation.ts`
   *  fails on them even though the scheduler only ever loads under Node.
   *  Leaving them external means they are required at runtime from
   *  node_modules instead of packed into a bundle. */
  serverExternalPackages: ["mongoose", "mongodb", "bcryptjs"],

  /** Runs on a VPS behind a reverse proxy, so the app sets its own security
   *  headers rather than relying on the proxy being configured correctly. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops a page being framed by another site, which is how clickjacking
          // gets a customer to click "pay" on something they cannot see.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here needs a camera, a microphone or a location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Two years, and only meaningful once HTTPS is actually on — which is
          // why the deployment guide puts the certificate first.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        // Uploaded files are served straight from disk or a bucket. A browser
        // must never be allowed to guess that one of them is HTML.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
        ],
      },
    ];
  },

  /** The VPS deployment copies a self-contained server rather than the whole
   *  node_modules tree. */
  output: "standalone",
};

export default nextConfig;
