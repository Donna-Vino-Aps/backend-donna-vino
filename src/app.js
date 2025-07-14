import express from "express";
import morgan from "morgan";
import { router } from "./routes/router.js"; // adjust path if needed
import cookieParser from "cookie-parser";
import { corsConfig } from "./config/index.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(corsConfig);
app.use(cookieParser());
app.use(authMiddleware);
app.use(globalLimiter);

// Mount the router that includes cloudinary and others
app.use(router);

export default app;
