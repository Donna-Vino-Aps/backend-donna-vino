import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";
import { resendVerificationLimiter } from "../../middleware/rateLimitMiddleware";
import * as logging from "../../util/logging.js";

const createApp = () => {
  const app = express();
  app.use(express.json());

  // A test-specific limiter to check global rate limit logic without making 200 requests
  const testGlobalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute for test
    limit: 2,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });

  app.get("/test-global", testGlobalLimiter, (req, res) => {
    res.status(200).json({ message: "Success" });
  });

  app.post("/resend-verification", resendVerificationLimiter, (req, res) => {
    res.status(200).json({ message: "Email sent" });
  });

  return app;
};

describe("Rate Limit Middleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("globalLimiter", () => {
    it("should block requests after reaching the limit", async () => {
      const app = createApp();
      await request(app).get("/test-global").expect(200);
      await request(app).get("/test-global").expect(200);

      const response = await request(app).get("/test-global");
      expect(response.status).toBe(429);
      expect(response.body.message).toBe(
        "Too many requests, please try again later.",
      );
    });
  });
});
