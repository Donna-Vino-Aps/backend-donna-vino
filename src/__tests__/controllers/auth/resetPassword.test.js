import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../../app";
import { User } from "../../../models";
import sendEmail from "../../../util/sendEmail";

// Ändra mocking så att rätt path används och sendEmail mockas korrekt
vi.mock("../../../util/sendEmail", () => ({
  default: vi.fn(),
}));

describe("POST /api/register/reset-password", () => {
  let userFindOneMock;
  let user;

  beforeEach(() => {
    user = {
      _id: "user123",
      email: "test@example.com",
      firstName: "Test",
      issueResetPasswordToken: vi.fn().mockResolvedValue("reset-token-abc"),
    };
    userFindOneMock = vi.spyOn(User, "findOne").mockResolvedValue(user);
    sendEmail.mockClear();
  });

  afterEach(() => {
    userFindOneMock.mockRestore();
  });

  it("should send reset email and return success for existing user", async () => {
    const res = await request(app)
      .post("/api/register/reset-password")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/password reset link has been sent/i);
    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Reset Your Password",
      "resetPassword",
      expect.objectContaining({
        name: "Test",
        token: "reset-token-abc",
      }),
    );
  });

  it("should return success false for non-existing user", async () => {
    userFindOneMock.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/register/reset-password")
      .send({ email: "notfound@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/password reset link has been sent/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should return 500 on error", async () => {
    userFindOneMock.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/api/register/reset-password")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/internal server error/i);
  });
});
