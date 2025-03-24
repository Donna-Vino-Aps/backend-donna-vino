import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { resendVerificationEmail } from "../../../controllers/authControllers/resendVerificationController.js";
import fs from "fs";
import path from "path";
import { sendEmail } from "../../../util/emailUtils.js";
import PendingUser from "../../../models/users/pendingUserModel.js";
import { generateToken } from "../../../services/token/tokenGenerator.js";
import { logError, logInfo } from "../../../util/logging.js";

vi.mock("fs");
vi.mock("path");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/users/pendingUserModel.js");
vi.mock("../../../services/token/tokenGenerator.js");
vi.mock("../../../util/logging.js");

describe("resendVerificationEmail Controller", () => {
  let req, res;
  const mockToken = "mock-verification-token";
  const mockEmail = "test.user@example.com";
  const lowerCaseEmail = "test.user@example.com";
  const mockPendingUser = {
    _id: "mock-pending-user-id",
    email: lowerCaseEmail,
    firstName: "Test",
    lastName: "User",
    isSubscribed: false,
  };

  beforeEach(() => {
    req = {
      query: {
        email: mockEmail,
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Setup default mock behavior
    fs.readFileSync.mockReturnValue("{{VERIFY_URL}}");
    path.resolve.mockReturnValue("/mock/path/to/template.html");
    sendEmail.mockResolvedValue(true);
    generateToken.mockResolvedValue(mockToken);
    PendingUser.findOne.mockResolvedValue(mockPendingUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if email is missing", async () => {
    req.query = {};

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      "Missing email in resend verification request",
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Email is required to resend verification",
    });
  });

  it("normalizes email to lowercase", async () => {
    req.query.email = "Test.User@Example.com";

    await resendVerificationEmail(req, res);

    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: "test.user@example.com",
    });
  });

  it("returns 404 if no pending user is found", async () => {
    PendingUser.findOne.mockResolvedValueOnce(null);

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(
        `No pending user found for email: ${lowerCaseEmail}`,
      ),
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "No pending registration found for this email. Please sign up first.",
    });
  });

  it("handles database error when finding pending user", async () => {
    PendingUser.findOne.mockRejectedValueOnce(
      new Error("Database connection error"),
    );

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Database error finding pending user for resend"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to process your request. Please try again later.",
    });
  });

  it("handles token generation error", async () => {
    generateToken.mockRejectedValueOnce(new Error("Token generation failed"));

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error generating new token for resend"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to create verification token. Please try again later.",
    });
  });

  it("handles email sending error", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Email sending failed"));

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error sending resend verification email"),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to send verification email. Please try again later.",
    });
  });

  it("selects the correct email template based on isSubscribed", async () => {
    // Test with subscribed user
    const subscribedUser = {
      ...mockPendingUser,
      isSubscribed: true,
    };
    PendingUser.findOne.mockResolvedValueOnce(subscribedUser);

    await resendVerificationEmail(req, res);

    expect(path.resolve).toHaveBeenCalledWith(
      expect.any(String),
      "src/templates/verifyEmailForSignupWithNewsletterTemplate.html",
    );

    // Test with non-subscribed user
    vi.clearAllMocks();
    PendingUser.findOne.mockResolvedValueOnce(mockPendingUser);
    generateToken.mockResolvedValue(mockToken);

    await resendVerificationEmail(req, res);

    expect(path.resolve).toHaveBeenCalledWith(
      expect.any(String),
      "src/templates/verifyEmailForSignupTemplate.html",
    );
  });

  it("successfully resends verification email", async () => {
    await resendVerificationEmail(req, res);

    // Verify token was generated
    expect(generateToken).toHaveBeenCalledWith(lowerCaseEmail);
    expect(logInfo).toHaveBeenCalledWith(
      `Generated new verification token for ${lowerCaseEmail}`,
    );

    // Verify email was sent with correct parameters
    expect(sendEmail).toHaveBeenCalledWith(
      mockPendingUser.email,
      "Verify your email address for Donna Vino",
      expect.any(String),
    );
    expect(logInfo).toHaveBeenCalledWith(
      `New verification email sent to ${mockPendingUser.email}`,
    );

    // Verify successful response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "Verification email resent. Please check your inbox to complete the signup process.",
      pendingUser: {
        email: mockPendingUser.email,
        firstName: mockPendingUser.firstName,
        lastName: mockPendingUser.lastName,
      },
    });
  });
});
