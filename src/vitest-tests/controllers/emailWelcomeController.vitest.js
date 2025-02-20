import { describe, it, beforeEach, expect, vi } from "vitest";
import { sendWelcomeEmail } from "../../controllers/authControllers/emailWelcomeController.js";
import bcrypt from "bcrypt";
import fs from "fs";
import { createTransporter } from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import path from "path";

vi.mock("fs");
vi.mock("../../util/logging.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("bcrypt", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      ...actual,
      hash: vi.fn().mockResolvedValue("hashed-string"),
      compare: vi.fn().mockResolvedValue(true),
    },
  };
});

const mockTransporter = {
  sendMail: vi.fn().mockResolvedValue({ messageId: "test123" }),
};

vi.mock("../../config/emailConfig.js", () => ({
  createTransporter: vi.fn(() => mockTransporter),
}));

vi.mock("../../models/userVerification.js", () => ({
  default: vi.fn(() => ({
    save: vi.fn().mockResolvedValue(),
  })),
}));

describe("sendWelcomeEmail", () => {
  const mockUser = {
    _id: "12345",
    email: "test@example.com",
  };

  const mockTemplate = "<html><body>Welcome Email</body></html>";

  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockTemplate);
    bcrypt.hash.mockResolvedValue("hashed-string");
    UserVerification.mockImplementation(() => ({
      save: vi.fn().mockResolvedValue(),
    }));

    createTransporter.mockReturnValue(mockTransporter);
    mockTransporter.sendMail.mockResolvedValue({ messageId: "test123" });
  });

  it("should send welcome email successfully", async () => {
    const result = await sendWelcomeEmail(mockUser);

    expect(result).toEqual({
      status: "PENDING",
      message: "Welcome email sent",
      data: {
        userId: "12345",
        email: "test@example.com",
      },
    });

    expect(fs.existsSync).toHaveBeenCalledWith(
      path.resolve(__dirname, "../../templates/emailWelcomeTemplate.html"),
    );
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
    expect(UserVerification.mock.calls.length).toBe(1);
    expect(mockTransporter.sendMail).toHaveBeenCalled();
  });

  it("should return an error if template file is not found", async () => {
    fs.existsSync.mockReturnValue(false);
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  it("should return an error if reading the template fails", async () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  it("should return an error if unique string hashing fails", async () => {
    bcrypt.hash.mockRejectedValue(new Error("Hashing failed"));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  it("should return an error if saving the verification record fails", async () => {
    UserVerification.mockImplementation(() => ({
      save: vi.fn().mockRejectedValue(new Error("DB save error")),
    }));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  it("should return an error if email sending fails", async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error("Email send error"));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });
});
