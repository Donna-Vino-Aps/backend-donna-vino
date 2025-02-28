import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { signUpUser } from "../../services/authService.js";
import PendingUser from "../../models/pendingUserModel.js";
import User from "../../models/userModels.js";
import { sendEmailController } from "../../controllers/sendEmailControllers/sendEmailController.js";
import { validatePendingUserData } from "../../util/validatePendingUserData.js";

vi.mock("../../models/pendingUserModel.js");
vi.mock("../../models/userModels.js");
vi.mock("../../controllers/sendEmailControllers/sendEmailController.js");
vi.mock("../../util/validatePendingUserData.js");
vi.mock("jsonwebtoken");

describe("signUpUser", () => {
  const mockUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "SecurePassword123",
    birthdate: "1990-01-01",
    isSubscribed: true,
  };

  const mockUserData2 = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "SecurePassword123",
    birthdate: "2010-01-01",
    isSubscribed: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.API_URL_LOCAL = "http://localhost:3000";
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await PendingUser.deleteMany();
  });

  it("should create a pending user and send a verification email", async () => {
    User.exists.mockResolvedValue(false);
    PendingUser.findOne.mockResolvedValue(null);
    PendingUser.prototype.save = vi.fn().mockResolvedValue();
    jwt.sign.mockReturnValue("test-verification-token");
    sendEmailController.mockResolvedValue();

    const result = await signUpUser(mockUserData);

    expect(validatePendingUserData).toHaveBeenCalledWith(mockUserData);
    expect(User.exists).toHaveBeenCalledWith({ email: mockUserData.email });
    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: mockUserData.email,
    });
    expect(PendingUser.prototype.save).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: mockUserData.email, firstName: "John", lastName: "Doe" },
      "test-secret",
      { expiresIn: "6h" },
    );
    expect(sendEmailController).toHaveBeenCalledWith({
      body: {
        to: mockUserData.email,
        subject: "Please Verify Your Email Address",
        templateName: "verifyEmailTemplate",
        templateData: {
          firstName: "John",
          lastName: "Doe",
          verificationLink:
            "http://localhost:3000/verify?token=test-verification-token",
        },
      },
    });

    expect(result.message).toBe(
      "Pending user created successfully. Please check your email to verify your account.",
    );
  });

  it("should throw an error if the user already exists", async () => {
    User.exists.mockResolvedValue(true);

    await expect(signUpUser(mockUserData)).rejects.toThrow(
      "Email is already registered. Please log in instead.",
    );
  });

  it("should throw an error if a pending user already exists", async () => {
    User.exists.mockResolvedValue(false);
    PendingUser.findOne.mockResolvedValue(mockUserData);

    await expect(signUpUser(mockUserData)).rejects.toThrow(
      "A verification email was already sent. Please check your inbox.",
    );
  });

  it("should throw an error if the user is under 18", async () => {
    const underageUser = { ...mockUserData2, birthdate: "2010-01-01" };

    await expect(signUpUser(underageUser)).rejects.toThrow(
      "User must be at least 18 years old.",
    );
  });

  it("should throw an error if email sending fails", async () => {
    User.exists.mockResolvedValue(false);
    PendingUser.findOne.mockResolvedValue(null);
    PendingUser.prototype.save = vi.fn().mockResolvedValue();
    jwt.sign.mockReturnValue("test-verification-token");
    sendEmailController.mockRejectedValue(new Error("Email sending failed"));

    await expect(signUpUser(mockUserData)).rejects.toThrow(
      "SignUpUser failed: Email sending failed",
    );
  });
});
