import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { preSignUp } from "../../../controllers/authControllers/preSignUpController.js";
import PendingUser from "../../../models/users/pendingUserModel.js";
import User from "../../../models/users/userModels.js";
import { logError, logInfo } from "../../../util/logging.js";
import * as userModel from "../../../models/users/userModels.js";
import validateAllowedFields from "../../../util/validateAllowedFields.js";
import { sendVerificationEmail } from "../../../services/email/verificationEmailService.js";

vi.mock("../../../models/users/pendingUserModel.js");
vi.mock("../../../models/users/userModels.js", () => {
  return {
    default: {
      findOne: vi.fn(),
    },
    validateUser: vi.fn().mockReturnValue([]), // Mock validateUser to return empty array by default
  };
});
vi.mock("../../../services/email/verificationEmailService.js");
vi.mock("../../../util/logging.js");
vi.mock("../../../util/validateAllowedFields.js", () => {
  return {
    default: vi.fn().mockReturnValue(null),
  };
});

describe("preSignUp Controller", () => {
  let req, res;
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
    sendVerificationEmail.mockResolvedValue();
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

    // Get the PendingUser.create call arguments and verify email is lowercase
    const createCall = PendingUser.create.mock.calls[0][0];
    expect(createCall.email).toBe("test.user@example.com");
  });

  it("rejects invalid user data", async () => {
    const validationErrors = ["Error 1", "Error 2"];
    userModel.validateUser.mockReturnValueOnce(validationErrors);

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "BAD REQUEST: Error 1, Error 2",
    });
  });

  it("rejects disallowed fields", async () => {
    const disallowedFields = ["role", "isAdmin"];
    validateAllowedFields.mockReturnValueOnce(disallowedFields);

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Invalid request",
    });
  });

  it("does not allow creating account if email already in use", async () => {
    User.findOne.mockResolvedValueOnce({ email: validUserData.email });

    await preSignUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: expect.stringContaining("A user with this email already exists."),
    });
  });

  it("handles database error when checking for existing user", async () => {
    User.findOne.mockRejectedValueOnce(
      new Error("Database error checking for existing user"),
    );

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      "Database error checking for existing user: Database error checking for existing user",
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  });

  it("handles database error when checking for pending user", async () => {
    PendingUser.findOne.mockRejectedValueOnce(
      new Error("Database error checking for pending user"),
    );

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      "Database error checking for pending user: Database error checking for pending user",
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  });

  it("handles database error when creating/updating pending user", async () => {
    PendingUser.create.mockRejectedValueOnce(
      new Error("Database error creating pending user"),
    );

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      "Database error creating/updating pending user: Database error creating pending user",
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to create your account. Please try again later.",
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

    expect(existingPendingUser.firstName).toBe(validUserData.firstName);
    expect(existingPendingUser.lastName).toBe(validUserData.lastName);
    expect(existingPendingUser.password).toBe(validUserData.password);
    expect(existingPendingUser.save).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Updated existing pending user"),
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(existingPendingUser);
  });

  it("creates new pending user if one does not exist", async () => {
    const createdUser = {
      _id: "mock-pending-user-id",
      ...validUserData,
      dateOfBirth: new Date(validUserData.dateOfBirth),
    };

    PendingUser.create.mockResolvedValueOnce(createdUser);

    await preSignUp(req, res);

    expect(PendingUser.create).toHaveBeenCalledWith({
      ...req.body.user,
      dateOfBirth: expect.any(Date),
    });
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Created new pending user"),
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(createdUser);
  });

  it("handles email verification service error and continues execution", async () => {
    sendVerificationEmail.mockRejectedValueOnce(
      new Error("Email verification failed"),
    );

    await preSignUp(req, res);

    expect(logError).toHaveBeenCalledWith(
      "Error sending verification email: Email verification failed",
    );

    // We still return 201 since we continue processing even after
    // an email sending error (we just log it)
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "Verification email sent. Please check your inbox to complete the signup process.",
      pendingUser: expect.objectContaining({
        email: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
      }),
    });
  });

  it("successfully completes the pre-signup process", async () => {
    const mockPendingUser = {
      _id: "pending-user-id",
      ...validUserData,
    };

    PendingUser.create.mockResolvedValueOnce(mockPendingUser);

    await preSignUp(req, res);

    // Verify verification email service was called with the pending user
    expect(sendVerificationEmail).toHaveBeenCalledWith(mockPendingUser);

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
