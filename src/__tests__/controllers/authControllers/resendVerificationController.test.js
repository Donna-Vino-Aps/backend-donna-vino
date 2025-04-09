import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { resendVerificationEmail } from "../../../controllers/authControllers/resendVerificationController.js";
import PendingUser from "../../../models/users/pendingUserModel.js";
import { sendVerificationEmail } from "../../../services/email/verificationEmailService.js";
import { logError, logInfo } from "../../../util/logging.js";

vi.mock("../../../models/users/pendingUserModel.js");
vi.mock("../../../services/email/verificationEmailService.js");
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
      redirect: vi.fn(),
    };

    // Reset all mocks
    vi.clearAllMocks();

    // Set up default mock implementations
    PendingUser.findOne.mockResolvedValue(mockPendingUser);
    sendVerificationEmail.mockResolvedValue(mockToken);
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
    const tokenError = new Error("Token generation failed");
    sendVerificationEmail.mockRejectedValueOnce(tokenError);

    await resendVerificationEmail(req, res);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error sending resend verification email: Token generation failed",
      ),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Unable to send verification email. Please try again later.",
    });
  });

  it("handles email sending error", async () => {
    const emailError = new Error("Email sending failed");
    // This error should not include "Token generation failed" to trigger the other error path
    sendVerificationEmail.mockRejectedValueOnce(emailError);

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

    expect(sendVerificationEmail).toHaveBeenCalledWith(subscribedUser);

    // Test with non-subscribed user
    vi.clearAllMocks();
    PendingUser.findOne.mockResolvedValueOnce(mockPendingUser);
    sendVerificationEmail.mockResolvedValue(mockToken);

    await resendVerificationEmail(req, res);

    expect(sendVerificationEmail).toHaveBeenCalledWith(mockPendingUser);
  });

  it("successfully resends verification email", async () => {
    await resendVerificationEmail(req, res);

    expect(sendVerificationEmail).toHaveBeenCalledWith(mockPendingUser);

    expect(logInfo).toHaveBeenCalledWith(
      `New verification email sent to ${mockPendingUser.email}`,
    );

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
