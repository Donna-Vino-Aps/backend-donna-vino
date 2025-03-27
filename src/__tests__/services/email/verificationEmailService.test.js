import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendVerificationEmail } from "../../../services/email/verificationEmailService.js";
import { generateToken } from "../../../services/token/tokenGenerator.js";
import { sendEmail } from "../../../util/emailUtils.js";
import fs from "fs";
import { logError, logInfo } from "../../../util/logging.js";

// Mock dependencies
vi.mock("../../../services/token/tokenGenerator.js");
vi.mock("../../../util/emailUtils.js");
vi.mock("fs");
vi.mock("../../../util/logging.js");

describe("verificationEmailService", () => {
  const mockUser = {
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    isSubscribed: false,
  };

  const mockSubscribedUser = {
    ...mockUser,
    isSubscribed: true,
  };

  const mockToken = "mock-token-12345";

  beforeEach(() => {
    vi.clearAllMocks();
    generateToken.mockResolvedValue(mockToken);
    fs.readFileSync.mockReturnValue("Template with {{VERIFY_URL}}");
    sendEmail.mockResolvedValue(true);
  });

  it("should generate a token and send an email for a standard user", async () => {
    await sendVerificationEmail(mockUser);

    // Verify token was generated
    expect(generateToken).toHaveBeenCalledWith(mockUser.email);

    // Verify correct template was selected
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("verifyEmailForSignupTemplate.html"),
      "utf-8",
    );

    // Verify email was sent with correct data
    expect(sendEmail).toHaveBeenCalledWith(
      mockUser.email,
      "Verify your email address for Donna Vino",
      expect.any(String),
    );

    // Verify log was created
    expect(logInfo).toHaveBeenCalledWith(
      `Verification email sent to ${mockUser.email}`,
    );
  });

  it("should use newsletter template for subscribed users", async () => {
    await sendVerificationEmail(mockSubscribedUser);

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(
        "verifyEmailForSignupWithNewsletterTemplate.html",
      ),
      "utf-8",
    );
  });

  it("should handle token generation errors", async () => {
    const error = new Error("Token generation error");
    generateToken.mockRejectedValueOnce(error);

    await expect(sendVerificationEmail(mockUser)).rejects.toThrow();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error sending verification email"),
    );
  });

  it("should handle email sending errors", async () => {
    const error = new Error("Email sending error");
    sendEmail.mockRejectedValueOnce(error);

    await expect(sendVerificationEmail(mockUser)).rejects.toThrow();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("Error sending verification email"),
    );
  });
});
