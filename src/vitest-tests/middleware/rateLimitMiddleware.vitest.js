import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  contactLimiter,
  contactHourlyLimiter,
} from "../../middleware/rateLimitMiddleware";

const app = express();
app.use(express.json());

app.post("/api/contact-us", contactLimiter, (req, res) => {
  res.status(200).json({ message: "Request received" });
});

app.post("/api/contact-us/hourly", contactHourlyLimiter, (req, res) => {
  res.status(200).json({ message: "Request received" });
});

describe("Rate Limit Middleware Tests", () => {
  it("should block requests after 3 requests within 1 minute", async () => {
    await request(app).post("/api/contact-us").send({}).expect(200);
    await request(app).post("/api/contact-us").send({}).expect(200);
    await request(app).post("/api/contact-us").send({}).expect(200);

    const response = await request(app).post("/api/contact-us").send({});
    expect(response.status).toBe(429);
    expect(response.body.message).toBe(
      "Too many contact requests. Please try again later.",
    );
  });

  it("should block requests after 10 requests within 1 hour", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post("/api/contact-us/hourly").send({}).expect(200);
    }

    const response = await request(app).post("/api/contact-us/hourly").send({});
    expect(response.status).toBe(429);
    expect(response.body.message).toBe(
      "Too many contact requests. Try again in an hour.",
    );
  });
});
