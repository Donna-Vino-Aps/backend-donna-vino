import { defineConfig } from "eslint-define-config";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    languageOptions: {
      globals: {
        node: true,
        es2021: true,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    plugins: {},
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }], // Disallow console.log, allow console.warn/error
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }], // Warn on unused vars except those starting with "_"
      "no-undef": "error", // Prevent undeclared variables
      "consistent-return": "warn", // Warn if return statements are inconsistent
      eqeqeq: ["error", "always"], // Enforce strict equality (===)
      "no-trailing-spaces": "error", // Disallow trailing spaces
      "no-magic-numbers": "warn", // Warn on magic numbers
      "prefer-const": "error", // Prefer const when variables aren't reassigned
      "no-duplicate-imports": "error", // Disallow duplicate imports
    },
  },
  {
    files: ["src/utils/logging.js"],
    rules: {
      "no-console": "off", // Allow console.log in logging.js
    },
  },
]);
