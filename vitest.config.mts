import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Tests cover the pricing engine and the money helpers it stands on — the one
 *  place a bug costs real money (plan section 6). Everything else is verified
 *  by hand. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
