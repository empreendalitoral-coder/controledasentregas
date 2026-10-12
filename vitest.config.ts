import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests exercise handlers directly, without Start's production RPC transform.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node" },
});