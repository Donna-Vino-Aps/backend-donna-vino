import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/vitest-tests/**/*.vitest.{js,ts}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/__tests__/**",
      "**/jest.config.*",
    ],
  },
});
