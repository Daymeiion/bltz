import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: false,
    setupFiles: ["tests/setup.ts"],
  },
});
