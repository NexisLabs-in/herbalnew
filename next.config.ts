import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /** Mongoose and the MongoDB driver reach for `net`, `child_process` and
   *  friends, which cannot be bundled — the Edge build of `instrumentation.ts`
   *  fails on them even though the scheduler only ever loads under Node.
   *  Leaving them external means they are required at runtime from
   *  node_modules instead of packed into a bundle. */
  serverExternalPackages: ["mongoose", "mongodb", "bcryptjs"],
};

export default nextConfig;
