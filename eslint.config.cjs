const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig([
  {
    ignores: ["**/node_modules/**", "**/.next/**"],
    languageOptions: {
      globals: {
        es2021: true,
        node: true,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^req|res$" },
      ],
      eqeqeq: ["error", "always"],
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
  },
  {
    files: ["src/utils/logging.js"],
    rules: {
      "no-console": "off",
    },
  },
]);
