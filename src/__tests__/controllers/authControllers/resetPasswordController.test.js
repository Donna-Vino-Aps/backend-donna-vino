import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetPassword,
  requestPasswordReset,
} from "../../../controllers/authControllers/resetPasswordController.js";
import * as emailUtils from "../../../util/emailUtils.js";
import * as authUtils from "../../../util/authUtils.js";
import * as validationUtils from "../../../util/validationErrorMessage.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import User from "../../../models/users/userModels.js";

vi.mock("../../../models/users/userModels.js", () => {
  return {
    default: {
      findOne: vi.fn(),
    },
    validateUser: vi.fn(),
  };
});
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../util/authUtils.js", () => {
  return {
    validatePassword: vi.fn(),
  };
});
vi.mock("../../../util/validationErrorMessage.js", () => {
  return {
    default: vi.fn(),
  };
});
vi.mock("jsonwebtoken");
vi.mock("bcrypt");
vi.mock("fs");

// Define mock user
const mockUser = {
  _id: "123456",
  email: "test@example.com",
  password: "newHashedPassword",
  authProvider: "local",
  save: vi.fn().mockResolvedValue(true),
};

describe("requestPasswordReset", () => {
  const mockReq = { body: { email: "test@example.com" } };
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if request body is invalid", async () => {
    await requestPasswordReset({ body: null }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 404 if user not found", async () => {
    User.findOne.mockResolvedValue(null);
    await requestPasswordReset(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it("should send password reset email if user exists", async () => {
    User.findOne.mockResolvedValue(mockUser);
    jwt.sign.mockReturnValue("mockedToken");
    fs.readFileSync.mockReturnValue("<html>{{RESET_PASSWORD_URL}}</html>");
    emailUtils.sendEmail.mockResolvedValue();

    await requestPasswordReset(mockReq, mockRes);

    expect(emailUtils.sendEmail).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      msg: "Password reset email sent",
    });
  });

  it("should handle internal server error", async () => {
    User.findOne.mockRejectedValue(new Error("DB Error"));
    await requestPasswordReset(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe("resetPassword", () => {
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  const validBody = {
    token: "validToken",
    newPassword: "newHashedPassword!",
    confirmPassword: "newHashedPassword",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.save.mockClear();
  });

  it("should return 400 if body is invalid", async () => {
    await resetPassword({ body: null }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 for missing fields", async () => {
    validationUtils.default.mockReturnValue("Token is required");
    await resetPassword({ body: {} }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 if passwords don't match", async () => {
    const body = { ...validBody, confirmPassword: "Mismatch123" };
    await resetPassword({ body }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 if password is invalid", async () => {
    authUtils.validatePassword.mockReturnValue({
      isValid: false,
      errors: ["Too weak"],
    });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 for invalid token purpose", async () => {
    jwt.verify.mockReturnValue({ purpose: "other" });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 if user not found", async () => {
    jwt.verify.mockReturnValue({
      purpose: "password_reset",
      email: "test@example.com",
    });
    User.findOne.mockResolvedValue(null);
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 if authProvider is not local", async () => {
    jwt.verify.mockReturnValue({
      purpose: "password_reset",
      email: "test@example.com",
    });
    User.findOne.mockResolvedValue({ ...mockUser, authProvider: "google" });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should return 400 if password is same as current", async () => {
    jwt.verify.mockReturnValue({
      purpose: "password_reset",
      email: "test@example.com",
    });
    User.findOne.mockResolvedValue({ ...mockUser });
    bcrypt.compare.mockResolvedValue(true);
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });


  it("should handle token expired error", async () => {
    jwt.verify.mockImplementation(() => {
      const err = new Error();
      err.name = "TokenExpiredError";
      throw err;
    });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should handle JWT error", async () => {
    jwt.verify.mockImplementation(() => {
      const err = new Error();
      err.name = "JsonWebTokenError";
      throw err;
    });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should handle generic server error", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("Unexpected");
    });
    await resetPassword({ body: validBody }, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
