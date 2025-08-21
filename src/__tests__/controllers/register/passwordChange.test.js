import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../../app";
import { User, PasswordChangeToken } from "../../../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

describe("POST /api/register/change-password", () => {
  const token = "valid-token";
  let user;
  let findByIdMock,
    fromJWTMock,
    jwtVerifyMock,
    bcryptCompareMock,
    bcryptHashMock;

  beforeEach(() => {
    user = {
      _id: "user123",
      password: "old-hash",
      save: vi.fn().mockResolvedValue(),
    };
    findByIdMock = vi.spyOn(User, "findById").mockResolvedValue(user);
    fromJWTMock = vi
      .spyOn(PasswordChangeToken, "fromJWT")
      .mockResolvedValue({ revoke: vi.fn().mockResolvedValue() });
    jwtVerifyMock = vi.spyOn(jwt, "verify").mockReturnValue({ sub: "user123" });
    bcryptCompareMock = vi.spyOn(bcrypt, "compare").mockResolvedValue(false);
    bcryptHashMock = vi.spyOn(bcrypt, "hash").mockResolvedValue("new-hash");
  });

  afterEach(() => {
    findByIdMock.mockRestore();
    fromJWTMock.mockRestore();
    jwtVerifyMock.mockRestore();
    bcryptCompareMock.mockRestore();
    bcryptHashMock.mockRestore();
  });

  it("should change password and return success", async () => {
    const res = await request(app)
      .post("/api/register/change-password")
      .send({ token, password: "newPassword123!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Password changed successfully/i);
    expect(user.save).toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", async () => {
    fromJWTMock.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/register/change-password")
      .send({ token: "invalid-token", password: "newPassword123!" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Authentication failed/i);
  });

  it("should return 400 if password is the same as before", async () => {
    bcryptCompareMock.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/register/change-password")
      .send({ token, password: "oldPassword123!" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/used before/i);
  });

  it("should return 500 on error", async () => {
    findByIdMock.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/api/register/change-password")
      .send({ token, password: "newPassword123!" });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/Internal server error/i);
  });
});
