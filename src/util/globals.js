import path from "path";
import { fileURLToPath } from "url";

// For Jest tests, we don't have import.meta.url working as expected,
// so we use process.cwd() to set __dirname assuming this file is in "src/util".
// Otherwise, use the normal method to get __dirname from the module URL.
export const __filename = process.env.JEST_WORKER_ID
  ? ""
  : fileURLToPath(import.meta.url);

export const __dirname = process.env.JEST_WORKER_ID
  ? path.join(process.cwd(), "src", "util")
  : path.dirname(fileURLToPath(import.meta.url));
