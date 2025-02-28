import { defineConfig } from "vitest/config";
import path from "path";

import tsconfigPaths from "vite-tsconfig-paths";

  export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
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
      setupFiles: "./vitest.setup.js",
    },
  });