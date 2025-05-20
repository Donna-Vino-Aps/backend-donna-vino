/**
 * Module Entry Point
 *
 * This index.js file serves as the package entry point for this directory.
 * It re-exports relevant submodules or functions to allow simplified imports.
 *
 * Usage:
 *   import { auth } from './controllers';
 *   auth.login(); // instead of requiring './controllers/auth/login.js'
 *
 * Folder-based import works because Node.js (or bundlers like Webpack) will
 * automatically resolve `index.js` when importing a directory.
 *
 * This pattern promotes modular architecture and clean import statements.
 */

/**
 * Re-exports all exports from `auth/index.js` under the `auth` namespace.
 *
 * This follows the convention that any module in the `controllers/` directory is implicitly a "controller",
 * so there's no need to name this `authController` — `auth` is sufficient and unambiguous.
 *
 * If naming collisions occur (e.g., with a similarly named service or model),
 * using the `as` syntax (`export * as auth`) allows clean namespacing and clarity.
 */
export * as auth from "./auth/index.js";
export * as register from "./register/index.js";
