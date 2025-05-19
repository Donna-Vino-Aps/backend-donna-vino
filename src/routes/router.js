// This file assembles and organizes all route modules.

import express from "express";
import authRouter from "./auth.js";
import registerRouter from "./register.js";
import userRouter from "./userRoutes.js";
import testRouter from "../../testRouters.js";
// import reviewRouter from "./reviewRoutes.js";
// import subscribeRouter from "./subscribeRoutes.js";
// import contactUsRouter from "./contactUsRoutes.js";
// import { contactHourlyLimiter, contactLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
const apiRouter = express.Router();

// Mount API routes under /api/*
router.use("/api", apiRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/register", registerRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/test", testRouter);
// apiRouter.use("/reviews", reviewRouter);
// apiRouter.use("/contact-us", contactLimiter, contactHourlyLimiter, contactUsRouter);
// apiRouter.use("/subscribe", subscribeRouter);

export default router;
