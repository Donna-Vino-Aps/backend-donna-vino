import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { signUp } from "../../../controllers/authControllers/signUpController.js";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../util/emailUtils.js";
import PendingUser from "../../../models/users/pendingUserModel.js";
import User from "../../../models/users/userModels.js";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
} from "../../../services/token/tokenRepository.js";
import { baseDonnaVinoEcommerceWebUrl } from "../../../config/environment.js";
import { logError, logInfo } from "../../../util/logging.js";

vi.mock("fs");
vi.mock("path");
vi.mock("jsonwebtoken");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/users/pendingUserModel.js");
vi.mock("../../../models/users/userModels.js");
vi.mock("../../../services/token/tokenRepository.js");
vi.mock("../../../config/environment.js", () => ({
  baseDonnaVinoEcommerceWebUrl: "http://localhost:3000",
}));
vi.mock("../../../util/logging.js");

describe("SignUp Controller", () => {
  let req, res;
  const mockToken = "mock-verification-token";
  const mockTokenId = "token-id-123";
  const mockEmail = "test@example.com";
  const mockJwtSecret = "test-jwt-secret";

  let pendingUserData;

  beforeEach(() => {
    process.env.JWT_SECRET = mockJwtSecret;

    req = {
      query: {
        token: mockToken,
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      redirect: vi.fn(),
    };

    pendingUserData = {
      _id: "pending-user-123",
      firstName: "John",
      lastName: "Doe",
      email: mockEmail,
      password: "Password123!",
      dateOfBirth: new Date("1990-01-01"),
      isVip: false,
      isSubscribed: false,
      authProvider: "local",
      toObject: vi.fn().mockReturnValue({
        firstName: "John",
        lastName: "Doe",
        email: mockEmail,
        password: "Password123!",
        dateOfBirth: new Date("1990-01-01"),
        isVip: false,
        isSubscribed: false,
        authProvider: "local",
      }),
    };

    fs.readFileSync.mockReturnValue("<html>Welcome {{NAME}}</html>");
    path.resolve.mockReturnValue("/mock/path/to/template.html");
    sendEmail.mockResolvedValue(true);

    jwt.verify.mockReturnValue({ id: mockTokenId, email: mockEmail });
    isTokenUsed.mockResolvedValue(false);
    markTokenAsUsed.mockResolvedValue(true);
    deleteToken.mockResolvedValue(true);

    PendingUser.findOne = vi.fn().mockResolvedValue(pendingUserData);
    PendingUser.deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });

    User.findOne = vi.fn().mockResolvedValue(null);
    User.create = vi.fn().mockImplementation((data) =>
      Promise.resolve({
        ...data,
        _id: "new-user-123",
        save: vi.fn().mockResolvedValue(true),
      }),
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  it("redirects when token is missing", async () => {
    req.query.token = undefined;

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?reason=missing_token`,
    );
    expect(logError).toHaveBeenCalled();
  });

  it("redirects when token is already used", async () => {
    isTokenUsed.mockResolvedValueOnce(true);

    await signUp(req, res);

    expect(isTokenUsed).toHaveBeenCalledWith(mockTokenId);
    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?token=${mockToken}&reason=token_used`,
    );
  });

  it("redirects when token is expired", async () => {
    jwt.verify.mockImplementationOnce(() => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";
      throw error;
    });

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?token=${mockToken}&reason=token_expired`,
    );
    expect(logError).toHaveBeenCalled();
  });

  it("redirects when token is invalid", async () => {
    jwt.verify.mockImplementationOnce(() => {
      const error = new Error("Invalid token");
      error.name = "JsonWebTokenError";
      throw error;
    });

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?reason=token_invalid`,
    );
    expect(logError).toHaveBeenCalled();
  });

  it("redirects when no pending user is found", async () => {
    PendingUser.findOne.mockResolvedValueOnce(null);

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?token=${mockToken}&reason=no_pending_user`,
    );
    expect(logError).toHaveBeenCalled();
  });

  it("redirects to login when user already exists", async () => {
    User.findOne.mockResolvedValueOnce({
      _id: "existing-user-id",
      email: mockEmail,
    });

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/login`,
    );
    expect(PendingUser.deleteOne).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalled();
  });

  it("handles database errors when creating user", async () => {
    User.create.mockRejectedValueOnce(new Error("Database error"));

    await signUp(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/verification-failed?reason=system_error`,
    );
    expect(logError).toHaveBeenCalled();
  });

  it("successfully creates a user and redirects to login", async () => {
    await signUp(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);

    expect(isTokenUsed).toHaveBeenCalledWith(mockTokenId);
    expect(markTokenAsUsed).toHaveBeenCalledWith(mockTokenId);

    expect(PendingUser.findOne).toHaveBeenCalledWith({ email: mockEmail });

    expect(User.create).toHaveBeenCalled();

    expect(sendEmail).toHaveBeenCalled();
    expect(path.resolve).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();

    expect(res.redirect).toHaveBeenCalledWith(
      `${baseDonnaVinoEcommerceWebUrl}/login`,
    );

    expect(logInfo).toHaveBeenCalled();
  });
});
