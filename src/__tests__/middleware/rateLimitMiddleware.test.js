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

  describe("resendVerificationLimiter", () => {
    it("should block the 4th request for the same email within an hour", async () => {
      const app = createApp();
      const testEmail = "test@example.com";

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/resend-verification")
          .send({ email: testEmail })
          .expect(200);
      }

      const response = await request(app)
        .post("/resend-verification")
        .send({ email: testEmail });

      expect(response.status).toBe(429);
      expect(response.body.message).toBe(
        "You have requested too many verification emails. Please try again in an hour.",
      );
      expect(logging.logError).toHaveBeenCalledWith(
        `Rate limit exceeded for email verification: ${testEmail}`,
      );
    });

    it("should not block requests for different emails", async () => {
      const app = createApp();
      const email1 = "test1@example.com";
      const email2 = "test2@example.com";

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/resend-verification")
          .send({ email: email1 })
          .expect(200);
      }

      await request(app)
        .post("/resend-verification")
        .send({ email: email1 })
        .expect(429);
      await request(app)
        .post("/resend-verification")
        .send({ email: email2 })
        .expect(200);
    });

    it("should use IP for rate limiting if email is not provided", async () => {
      const app = createApp();
      for (let i = 0; i < 3; i++) {
        await request(app).post("/resend-verification").send({}).expect(200);
      }

      const response = await request(app).post("/resend-verification").send({});

      expect(response.status).toBe(429);
      expect(logging.logError).toHaveBeenCalledWith(
        "Rate limiting attempted with missing email. Using IP instead.",
      );
      expect(logging.logError).toHaveBeenCalledWith(
        expect.stringMatching(/^Rate limit exceeded for email verification: /),
      );
    });

    it("should reset the limit after the windowMs time has passed", async () => {
      const app = createApp();
      const testEmail = "test-time@example.com";

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/resend-verification")
          .send({ email: testEmail })
          .expect(200);
      }

      await request(app)
        .post("/resend-verification")
        .send({ email: testEmail })
        .expect(429);

      // Advance time by 1 hour + 1 second
      vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

      // The limit should be reset now
      await request(app)
        .post("/resend-verification")
        .send({ email: testEmail })
        .expect(200);
    });
  });
});
