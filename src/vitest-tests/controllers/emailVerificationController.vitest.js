import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import transporter from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import {
  resolvePath,
  sendVerificationEmail,
} from "../../controllers/authControllers/emailVerificationController.js";
import { logError, logInfo } from "../../util/logging.js";

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

vi.mock("uuid", () => ({
  v4: vi.fn(),
}));
vi.mock("fs");
vi.mock("path");
vi.mock("../../config/emailConfig.js");
vi.mock("../../models/userVerification.js");
vi.mock("../../models/userModels.js");
vi.mock("../../util/logging.js");

describe("Auth Controller Unit Tests", () => {
  describe("resolvePath", () => {
    it("should resolve path correctly in GitHub Actions environment", () => {
      process.env.GITHUB_ACTIONS = "true";
      const relativePath = "../../templates/verifyEmailTemplate.html";
      const expectedPath = path.resolve(
        path.join(process.cwd(), "src"),
        relativePath,
      );
      expect(resolvePath(relativePath)).toBe(expectedPath);
    });

    it("should resolve path correctly in local environment", () => {
      delete process.env.GITHUB_ACTIONS;
      const relativePath = "../../templates/verifyEmailTemplate.html";
      const expectedPath = path.resolve(__dirname, relativePath);
      expect(resolvePath(relativePath)).toBe(expectedPath);
    });
  });

  describe("sendVerificationEmail", () => {
    it("should send a verification email successfully", async () => {
      const user = { _id: "123", email: "test@example.com" };
      const uniqueString = "uuid123123";
      uuidv4.mockReturnValue("uuid123");
      bcrypt.hash.mockResolvedValue("hashed-string");
      fs.readFileSync.mockReturnValue("<html>{{VERIFY_URL}}</html>");
      UserVerification.prototype.save.mockResolvedValue(true);
      transporter.sendMail.mockResolvedValue(true);

      const result = await sendVerificationEmail(user);

      expect(uuidv4).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(uniqueString, 10);
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(UserVerification.prototype.save).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith(
        "Verification email sent successfully",
      );
      expect(result).toEqual({
        success: true,
        message: "Verification email sent",
      });
    });

    it("should throw an error if email template cannot be read", async () => {
      const user = { _id: "123", email: "test@example.com" };
      fs.readFileSync.mockImplementation(() => {
        throw new Error("Template read error");
      });

      await expect(sendVerificationEmail(user)).rejects.toThrow(
        "Error reading email template",
      );
      expect(logError).toHaveBeenCalledWith(
        "Error reading email template: Template read error",
      );
    });
  });
});
