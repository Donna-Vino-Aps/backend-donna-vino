import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserPre, EmailVerificationToken } from "../../../models/index.js";
import { resendVerificationEmail } from "../../../controllers/register/resendVerification.js";
import { logError } from "../../../util/logging.js";
import mockedSendEmail from "../../../util/sendEmail.js";

vi.mock("../../../models/index.js");
vi.mock("../../../util/sendEmail.js", () => ({
  default: vi.fn(), // Mock the default export of sendEmail.js
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.post("/test-resend", resendVerificationEmail);
  return app;
};

let app;

// Mock data
const mockUserPreData = {
  _id: "preUserId123",
  email: "test@example.com",
  firstName: "TestUser",
  issueEmailVerificationToken: vi.fn(),
};

const mockEmailToken = "newGeneratedToken123";

describe("Resend Verification Email Controller", () => {
  beforeEach(() => {
    app = createApp();

    // Reset mocks for UserPre
    UserPre.findOne = vi.fn();
    mockUserPreData.issueEmailVerificationToken.mockClear();
    mockUserPreData.issueEmailVerificationToken.mockResolvedValue(
      mockEmailToken,
    ); // Default happy path

    // Reset mocks for EmailVerificationToken
    EmailVerificationToken.deleteMany = vi
      .fn()
      .mockResolvedValue({ deletedCount: 1 });

    // Reset mocks for sendEmail (imported as mockedSendEmail)
    mockedSendEmail.mockClear();
    mockedSendEmail.mockResolvedValue(true);

    // Reset mocks for logError
    logError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /test-resend", () => {
    it("should successfully resend verification email if user exists", async () => {
      UserPre.findOne.mockResolvedValue(mockUserPreData);

      const requestBody = { email: "test@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "A new verification link has been sent to your email address.",
      });

      expect(UserPre.findOne).toHaveBeenCalledWith({
        email: requestBody.email,
      });
      expect(EmailVerificationToken.deleteMany).toHaveBeenCalledWith({
        user: mockUserPreData._id,
      });
      expect(mockUserPreData.issueEmailVerificationToken).toHaveBeenCalled();
      expect(mockedSendEmail).toHaveBeenCalledWith(
        requestBody.email,
        "Verify your email address for Donna Vino",
        "emailConfirmation",
        {
          email: requestBody.email,
          token: mockEmailToken,
          baseUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/),
          name: mockUserPreData.firstName,
        },
      );
      expect(logError).not.toHaveBeenCalled();
    });

    it("should return 400 if email is not provided", async () => {
      const response = await request(app).post("/test-resend").send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Email is required.",
      });
      expect(UserPre.findOne).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("should return 200 with generic message if pre-registered user not found", async () => {
      UserPre.findOne.mockResolvedValue(null);
      const requestBody = { email: "nonexistent@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message:
          "If an account with this email exists, a new verification link has been sent.",
      });

      expect(UserPre.findOne).toHaveBeenCalledWith({
        email: requestBody.email,
      });
      expect(logError).toHaveBeenCalledWith(
        `Resend verification attempt for non-existent pre-user email: ${requestBody.email}`,
      );
      expect(EmailVerificationToken.deleteMany).not.toHaveBeenCalled();
      expect(
        mockUserPreData.issueEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("should return 500 if UserPre.findOne throws an error", async () => {
      const errorMessage = "Database connection error";
      UserPre.findOne.mockRejectedValue(new Error(errorMessage));
      const requestBody = { email: "test@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "An internal server error occurred. Please try again later.",
      });

      expect(UserPre.findOne).toHaveBeenCalledWith({
        email: requestBody.email,
      });
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        "Error resending verification email",
      );
      expect(EmailVerificationToken.deleteMany).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("should return 500 if EmailVerificationToken.deleteMany throws an error", async () => {
      UserPre.findOne.mockResolvedValue(mockUserPreData);
      const errorMessage = "DeleteMany failed";
      EmailVerificationToken.deleteMany.mockRejectedValue(
        new Error(errorMessage),
      );
      const requestBody = { email: "test@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "An internal server error occurred. Please try again later.",
      });
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        "Error resending verification email",
      );
      expect(
        mockUserPreData.issueEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("should return 500 if user.issueEmailVerificationToken throws an error", async () => {
      UserPre.findOne.mockResolvedValue(mockUserPreData);
      const errorMessage = "Token issuance failed";
      mockUserPreData.issueEmailVerificationToken.mockRejectedValue(
        new Error(errorMessage),
      );
      const requestBody = { email: "test@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "An internal server error occurred. Please try again later.",
      });
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        "Error resending verification email",
      );
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("should return 500 if sendEmail throws an error", async () => {
      UserPre.findOne.mockResolvedValue(mockUserPreData);
      const errorMessage = "Email sending failed";
      mockedSendEmail.mockRejectedValue(new Error(errorMessage));
      const requestBody = { email: "test@example.com" };

      const response = await request(app)
        .post("/test-resend")
        .send(requestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "An internal server error occurred. Please try again later.",
      });
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        "Error resending verification email",
      );
    });
  });
});
