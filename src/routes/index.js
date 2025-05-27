/**
 * Module Entry Point
 *
 * This index.js file serves as the package entry point for this directory.
 * It re-exports relevant submodules or functions to allow simplified imports.
 *
 * Usage:
 *   import router from './routes';
 *   // import router from './routes/route.js'
 *
 * Folder-based import works because Node.js (or bundlers like Webpack) will
 * automatically resolve `index.js` when importing a directory.
 *
 * This pattern promotes modular architecture and clean import statements.
 */

export { default as router } from "./router.js";
