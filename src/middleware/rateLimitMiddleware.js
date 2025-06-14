import rateLimit from "express-rate-limit";
import { logError } from "../util/logging.js";

/**
 * Global rate limiter - applies to all routes
 * Limits each IP to 200 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/**
 * Email verification rate limiter - limits by email address
 * Allows 5 verification emails per email address per hour
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,

  keyGenerator: (req, _res) => {
    const email = req.body?.email;
    if (!email) {
      logError("Rate limiting attempted with missing email. Using IP instead.");
      return req.ip;
    }
    return email;
  },

  message: {
    success: false,
    message:
      "You have requested too many verification emails. Please try again in an hour.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,

  handler: (req, res, _next, options) => {
    const key = options.keyGenerator(req, res);
    logError(`Rate limit exceeded for email verification: ${key}`);
    res.status(options.statusCode).json(options.message);
  },
});
