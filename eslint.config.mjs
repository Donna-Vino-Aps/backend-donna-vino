import { defineConfig } from "eslint-define-config";
import prettier from "eslint-plugin-prettier";

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
    plugins: {
      prettier,
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "consistent-return": "warn",
      eqeqeq: ["error", "always"],
      "no-trailing-spaces": "error",
      "no-magic-numbers": "warn",
      "prefer-const": "error",
      "no-duplicate-imports": "error",
      "prettier/prettier": [
        "error",
        { singleQuote: false, semi: true, trailingComma: "all", tabWidth: 2 },
      ],
    },
  },
  {
    files: ["src/utils/logging.js"],
    rules: {
      "no-console": "off", // Allow console.log in logging.js
    },
  },
]);
