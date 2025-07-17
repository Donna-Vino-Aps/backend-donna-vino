import express from "express";
import morgan from "morgan";
import router from "./routes/router.js";
import cookieParser from "cookie-parser";
import corsConfig from "./config/cors.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";

const app = express();

app.use(corsConfig);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);
app.use(globalLimiter);

// Mount the top-level router
// All routing logic must be implemented in ./routes and its children — none should be defined here
app.use(router);

export default app;
// Debug-only middleware used to log HTTP requests in development.
