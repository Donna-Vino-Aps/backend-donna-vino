import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.{js,ts}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: "./vitest.setup.js",
    hookTimeout: 60000,
  },
});
