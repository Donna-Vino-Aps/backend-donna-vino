import rateLimit from "express-rate-limit";

// Limit to 3 requests per minute (short-term protection against spam)
export const contactLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Maximum of 3 requests per IP
  message: {
    success: false,
    message: "Too many contact requests. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated X-RateLimit headers
});

// Limit to 10 requests per hour (long-term protection against persistent abuse)
export const contactHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Maximum of 10 requests per IP
  message: {
    success: false,
    message: "Too many contact requests. Try again in an hour.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated X-RateLimit headers
});
