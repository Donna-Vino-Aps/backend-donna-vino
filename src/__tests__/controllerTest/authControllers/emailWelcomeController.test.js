import { sendWelcomeEmail } from "../../../controllers/authControllers/emailWelcomeController.js";
import bcrypt from "bcrypt";
import fs from "fs";
import { createTransporter } from "../../../config/emailConfig.js";
import UserVerification from "../../../models/userVerification.js";
import path from "path";

jest.mock("fs");
jest.mock("../../../util/logging.js", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-string"),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: "test123" }),
};

jest.mock("../../../config/emailConfig.js", () => ({
  createTransporter: jest.fn(() => mockTransporter),
}));

jest.mock("../../../models/userVerification.js", () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(),
  }));
});

describe("sendWelcomeEmail", () => {
  const mockUser = {
    _id: "12345",
    email: "test@example.com",
  };

  const mockTemplate = "<html><body>Welcome Email</body></html>";

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockTemplate);
    bcrypt.hash.mockResolvedValue("hashed-string");
    UserVerification.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(),
    }));

    createTransporter.mockReturnValue(mockTransporter);
    mockTransporter.sendMail.mockResolvedValue({ messageId: "test123" });
  });

  test("should send welcome email successfully", async () => {
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
      path.resolve(__dirname, "../../../templates/emailWelcomeTemplate.html"),
    );
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
    expect(UserVerification.mock.calls.length).toBe(1);
    expect(mockTransporter.sendMail).toHaveBeenCalled();
  });

  test("should return an error if template file is not found", async () => {
    fs.existsSync.mockReturnValue(false);
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  test("should return an error if reading the template fails", async () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  test("should return an error if unique string hashing fails", async () => {
    bcrypt.hash.mockRejectedValue(new Error("Hashing failed"));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  test("should return an error if saving the verification record fails", async () => {
    UserVerification.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error("DB save error")),
    }));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });

  test("should return an error if email sending fails", async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error("Email send error"));
    const result = await sendWelcomeEmail(mockUser);
    expect(result).toEqual({
      status: "FAILED",
      message: "Welcome email failed",
    });
  });
});
