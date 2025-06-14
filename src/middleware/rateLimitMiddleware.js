import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes per IP
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
