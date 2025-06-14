import express from "express";
import morgan from "morgan";

/**
 * Even though `index.js` is traditionally associated with CommonJS-style `require` usage,
 * I still recommend using it to encapsulate the internal structure of the routes directory
 * and simplify imports — treating it like a self-contained module or package.
 *
 * While this pattern may not be idiomatic for some JavaScript developers,
 * it promotes a clean, modular architecture that's engineer-friendly and easy to scale.
 */

import { router } from "./routes/index.js";

import cookieParser from "cookie-parser";
import { corsConfig } from "./config/index.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";

// Create an express server
const app = express();

// Debug-only middleware used to log HTTP requests in development.
// Helps visualize real-time data exchange and is especially useful for demoing
// how routes are triggered and how automatic Swagger documentation is generated.
app.use(morgan("dev")); // Logs method, URL, status, and response time

// Register only global/common middlewares here

// No request-handling logic or route-specific middleware belongs in this file
app.use(express.json());
app.use(corsConfig);
app.use(cookieParser());
app.use(authMiddleware);
app.use(globalLimiter);

// Mount the top-level router
// All routing logic must be implemented in ./routes and its children — none should be defined here
app.use(router);

export default app;
