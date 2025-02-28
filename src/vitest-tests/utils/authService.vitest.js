import { describe, it, beforeEach, expect, vi } from "vitest";
import { signUpUser } from "../../services/authService.js";
import PendingUser from "../../models/pendingUserModel.js";
import User from "../../models/userModels.js";
import { sendEmailController } from "../../controllers/sendEmailControllers/sendEmailController.js";
import { logError } from "../../util/logging.js";

// Mock dependencies
vi.mock("../../models/pendingUserModel.js", () => {
  return {
    default: {
      findOne: vi.fn(),
      exists: vi.fn(),
      create: vi.fn(),
    },
    PendingUser: class {
      constructor(data) {
        Object.assign(this, data);
      }
      save = vi.fn().mockResolvedValue();
    },
  };
});

vi.mock("../../models/userModels.js", () => ({
  default: {
    exists: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mockedToken"),
  },
}));


vi.mock("@/controllers/sendEmailControllers/sendEmailController.js", () => ({
  sendEmailController: vi.fn(),
}));

vi.mock("@/util/logging.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

describe("AuthService - signUpUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmailController.mockResolvedValue(Promise.resolve()); // Ensures sendEmailController always returns a resolved promise
  });

  it("should successfully create a pending user", async () => {
    PendingUser.findOne.mockResolvedValue(null); // No existing pending user
    User.exists.mockResolvedValue(false); // No existing user
    sendEmailController.mockResolvedValue();

    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "securepassword",
      birthdate: "2000-01-01",
    };

    const result = await signUpUser(userData);

    expect(result.message).toBe(
      "Pending user created successfully. Please check your email to verify your account."
    );
    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: "john@example.com",
    });
    expect(User.exists).toHaveBeenCalledWith({ email: "john@example.com" });
    expect(PendingUser.prototype.save).toHaveBeenCalled();
    expect(sendEmailController).toHaveBeenCalled();
  });

  it("should throw an error if email is already registered", async () => {
    User.exists.mockResolvedValue(true); // Simulate existing user

    const userData = {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "securepassword",
      birthdate: "2000-05-10",
    };

    await expect(signUpUser(userData)).rejects.toThrowError(
      "Email is already registered. Please log in instead."
    );

    expect(User.exists).toHaveBeenCalledWith({ email: "jane@example.com" });
  });

  it("should throw an error if email is already in pending list", async () => {
    PendingUser.findOne.mockResolvedValue({ email: "pending@example.com" });

    const userData = {
      firstName: "Alex",
      lastName: "Smith",
      email: "pending@example.com",
      password: "securepassword",
      birthdate: "1995-03-15",
    };

    await expect(signUpUser(userData)).rejects.toThrowError(
      "A verification email was already sent. Please check your inbox."
    );

    expect(PendingUser.findOne).toHaveBeenCalledWith({
      email: "pending@example.com",
    });
  });

  it("should throw an error if birthdate is invalid", async () => {
    const userData = {
      firstName: "Invalid",
      lastName: "User",
      email: "invalid@example.com",
      password: "securepassword",
      birthdate: "not-a-date",
    };

    await expect(signUpUser(userData)).rejects.toThrowError("Invalid birthdate.");
  });

  it("should throw an error if user is under 18", async () => {
    const userData = {
      firstName: "Young",
      lastName: "User",
      email: "young@example.com",
      password: "securepassword",
      birthdate: "2010-06-15",
    };

    await expect(signUpUser(userData)).rejects.toThrowError(
      "You must be at least 18 years old to register."
    );
  });

  it("should handle database save errors", async () => {
    PendingUser.findOne.mockResolvedValue(null);
    User.exists.mockResolvedValue(false);
    PendingUser.prototype.save = vi
      .fn()
      .mockRejectedValue(new Error("DB save error"));

    const userData = {
      firstName: "Error",
      lastName: "Case",
      email: "error@example.com",
      password: "securepassword",
      birthdate: "1990-07-07",
    };

    await expect(signUpUser(userData)).rejects.toThrowError(
      "SignUpUser failed: DB save error"
    );

    expect(logError).toHaveBeenCalled();
  });
});
