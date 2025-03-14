import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { preSignUp } from "../../../controllers/authControllers/preSignUpController.js";
import fs from "fs";
import path from "path";
import { sendEmail } from "../../../util/emailUtils.js";
import PendingUser from "../../../models/users/pendingUserModel.js";
import User from "../../../models/users/userModels.js";
import { generateToken } from "../../../services/token/tokenGenerator.js";
import { logError, logInfo } from "../../../util/logging.js";
import * as userModel from "../../../models/users/userModels.js";
import validateAllowedFields from "../../../util/validateAllowedFields.js";

vi.mock("fs");
vi.mock("path");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/users/pendingUserModel.js");
vi.mock("../../../models/users/userModels.js", () => {
  return {
    default: {
      findOne: vi.fn(),
    },
    validateUser: vi.fn().mockReturnValue([]), // Mock validateUser to return empty array by default
  };
});
vi.mock("../../../services/token/tokenGenerator.js");
vi.mock("../../../util/logging.js");
vi.mock("../../../util/validateAllowedFields.js", () => {
  return {
    default: vi.fn().mockReturnValue(null),
  };
});

describe("preSignUp Controller", () => {
  let req, res;
  const mockToken = "mock-verification-token";
  const validUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "Password123!",
    dateOfBirth: "1990-01-01",
    isSubscribed: false,
    isVip: false,
    authProvider: "local",
  };

  beforeEach(() => {
    req = {
      body: {
        user: { ...validUserData },
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    vi.clearAllMocks();

    // Setup default mock behavior
    fs.readFileSync.mockReturnValue("{{VERIFY_URL}}");
    path.resolve.mockReturnValue("/mock/path/to/template.html");
    sendEmail.mockResolvedValue(true);
    generateToken.mockResolvedValue(mockToken);
    userModel.validateUser.mockReturnValue([]);
    validateAllowedFields.mockReturnValue(null);

    User.findOne.mockResolvedValue(null);
    PendingUser.findOne.mockResolvedValue(null);
    PendingUser.create.mockImplementation((data) =>
      Promise.resolve({
        ...data,
        _id: "mock-pending-user-id",
        save: vi.fn().mockResolvedValue(true),
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if user object is missing", async () => {
    req.body.user = undefined;

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: expect.stringContaining("Invalid request"),
    });
  });

  it("normalizes email to lowercase", async () => {
    req.body.user.email = "Test.User@Example.com";

    await preSignUp(req, res);

    expect(req.body.user.email).toBe("test.user@example.com");
  });

  it("returns 400 if fields are not allowed", async () => {
    validateAllowedFields.mockReturnValueOnce("Invalid field: unknownField");

    req.body.user.unknownField = "some value";

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: expect.stringContaining("Invalid request"),
    });
  });

  it("returns 400 if validation fails", async () => {
    userModel.validateUser.mockReturnValueOnce(["Password must be strong"]);

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: expect.any(String),
    });
  });

  it("returns 200 if user already exists", async () => {
    const existingUser = {
      _id: "existing-user-id",
      firstName: validUserData.firstName,
      lastName: validUserData.lastName,
      email: validUserData.email,
    };

    User.findOne.mockResolvedValueOnce(existingUser);

    await preSignUp(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: validUserData.email });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "User already exists.",
    });
  });

  it("handles database error when checking for existing user", async () => {
    User.findOne.mockRejectedValueOnce(new Error("Database connection error"));

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Database error checking for existing user"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  });

  it("handles database error when checking for pending user", async () => {
    PendingUser.findOne.mockRejectedValueOnce(
      new Error("Database connection error"),
    );

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Database error checking for pending user"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  });

  it("handles token generation error", async () => {
    generateToken.mockRejectedValueOnce(new Error("Token generation failed"));

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error generating token"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to create verification token. Please try again later.",
    });
  });

  it("updates existing pending user if one exists", async () => {
    const existingPendingUser = {
      _id: "pending-user-id",
      email: validUserData.email,
      save: vi.fn().mockResolvedValue(true),
    };

    PendingUser.findOne.mockResolvedValueOnce(existingPendingUser);

    await preSignUp(req, res);

    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: validUserData.email,
    });
    expect(existingPendingUser.firstName).toBe(validUserData.firstName);
    expect(existingPendingUser.lastName).toBe(validUserData.lastName);
    expect(existingPendingUser.isVip).toBe(validUserData.isVip);
    expect(existingPendingUser.authProvider).toBe(validUserData.authProvider);
    expect(existingPendingUser.save).toHaveBeenCalled();
    expect(PendingUser.create).not.toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Updated existing pending user"),
    );
  });

  it("creates a new pending user if one doesn't exist", async () => {
    await preSignUp(req, res);

    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: validUserData.email,
    });
    expect(PendingUser.create).toHaveBeenCalledWith({
      ...validUserData,
      dateOfBirth: expect.any(Date),
    });
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Created new pending user"),
    );
  });

  it("handles database error when creating/updating pending user", async () => {
    PendingUser.create.mockRejectedValueOnce(new Error("Database error"));

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Database error creating/updating pending user"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to create your account. Please try again later.",
    });
  });

  it("handles email sending error and continues execution", async () => {
    const mockPendingUser = {
      _id: "pending-user-id",
      ...validUserData,
      verificationToken: mockToken,
    };

    PendingUser.create.mockResolvedValueOnce(mockPendingUser);
    sendEmail.mockRejectedValueOnce(new Error("Email sending failed"));

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error sending verification email"),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "Verification email sent. Please check your inbox to complete the signup process.",
      pendingUser: {
        email: mockPendingUser.email,
        firstName: mockPendingUser.firstName,
        lastName: mockPendingUser.lastName,
      },
    });
  });

  it("selects the correct email template based on isSubscribed", async () => {
    req.body.user.isSubscribed = true;

    await preSignUp(req, res);

    expect(path.resolve).toHaveBeenCalledWith(
      expect.any(String),
      "src/templates/verifyEmailForSignupWithNewsletterTemplate.html",
    );

    vi.clearAllMocks();
    userModel.validateUser.mockReturnValue([]);
    validateAllowedFields.mockReturnValue(null);
    req.body.user.isSubscribed = false;

    await preSignUp(req, res);

    expect(path.resolve).toHaveBeenCalledWith(
      expect.any(String),
      "src/templates/verifyEmailForSignupTemplate.html",
    );
  });

  it("successfully completes the pre-signup process", async () => {
    const mockPendingUser = {
      _id: "pending-user-id",
      ...validUserData,
      verificationToken: mockToken,
    };

    PendingUser.create.mockResolvedValueOnce(mockPendingUser);

    await preSignUp(req, res);

    // Verify email was sent with correct parameters
    expect(sendEmail).toHaveBeenCalledWith(
      validUserData.email,
      "Verify your email address for Donna Vino",
      expect.any(String),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "Verification email sent. Please check your inbox to complete the signup process.",
      pendingUser: {
        email: mockPendingUser.email,
        firstName: mockPendingUser.firstName,
        lastName: mockPendingUser.lastName,
      },
    });
  });
});
