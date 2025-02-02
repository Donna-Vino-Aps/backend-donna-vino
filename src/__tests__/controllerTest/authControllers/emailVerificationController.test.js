import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import transporter from "../../../config/emailConfig.js";
import UserVerification from "../../../models/userVerification.js";
import User from "../../../models/userModels.js";
import {
  resolvePath,
  sendVerificationEmail,
  resendVerificationLink,
  verifyEmail,
} from "../../../controllers/authControllers/emailVerificationController.js";
import { logError, logInfo } from "../../../util/logging.js";

// Mock dependencies
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
jest.mock("fs");
jest.mock("path");
jest.mock("../../../config/emailConfig.js");
jest.mock("../../../models/userVerification.js");
jest.mock("../../../models/userModels.js");
jest.mock("../../../util/logging.js");

describe("Auth Controller Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
      sendFile: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("resolvePath", () => {
    it("should resolve path correctly in GitHub Actions environment", () => {
      process.env.GITHUB_ACTIONS = "true";
      const relativePath = "../templates/verifyEmailTemplate.html";
      const expectedPath = path.resolve(
        path.join(process.cwd(), "src"),
        relativePath,
      );
      expect(resolvePath(relativePath)).toBe(expectedPath);
    });

    it("should resolve path correctly in local environment", () => {
      delete process.env.GITHUB_ACTIONS;
      const relativePath = "../templates/verifyEmailTemplate.html";
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

    it("should throw an error if sending email fails", async () => {
      const user = { _id: "123", email: "test@example.com" };
      fs.readFileSync.mockReturnValue("<html>{{VERIFY_URL}}</html>");
      UserVerification.prototype.save.mockResolvedValue(true);
      transporter.sendMail.mockRejectedValue(new Error("Email send error"));

      await expect(sendVerificationEmail(user)).rejects.toThrow(
        "Verification email process failed",
      );
      expect(logError).toHaveBeenCalledWith(
        "Failed to send verification email: Email send error",
      );
    });
  });

  describe("resendVerificationLink", () => {
    it("should verify email successfully if unique string matches", () => {
      req.params = { userId: "123", uniqueString: "valid-string" };
      const mockVerification = {
        userId: "123",
        uniqueString: "hashed-string",
        expiresAt: Date.now() + 10000,
      };
      UserVerification.findOne.mockResolvedValue(mockVerification);
      bcrypt.compare.mockResolvedValue(true);
      User.updateOne.mockResolvedValue(true);

      verifyEmail(req, res).then(() => {
        expect(UserVerification.findOne).toHaveBeenCalledWith({
          userId: "123",
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(
          "valid-string",
          "hashed-string",
        );
        expect(User.updateOne).toHaveBeenCalledWith(
          { _id: "123" },
          { verified: true },
        );
        expect(res.sendFile).toHaveBeenCalled();
      });
    });

    it("should return 400 if userId or email is missing", async () => {
      req.body = {};

      await resendVerificationLink(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Empty user details are not allowed",
      });
    });

    it("should return 500 if sending email fails", async () => {
      req.body = { userId: "123", email: "test@example.com" };
      UserVerification.deleteMany.mockResolvedValue(true);
      jest
        .spyOn(
          require("../../../controllers/authControllers/emailVerificationController"),
          "sendVerificationEmail",
        )
        .mockRejectedValue(new Error("Verification email process failed"));

      await resendVerificationLink(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          "Verification Link Resend Error: Verification email process failed",
      });
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully if unique string matches", async () => {
      req.params = { userId: "123", uniqueString: "valid-string" };
      const mockVerification = {
        userId: "123",
        uniqueString: "hashed-string",
        expiresAt: Date.now() + 10000,
      };
      UserVerification.findOne.mockResolvedValue(mockVerification);
      bcrypt.compare.mockResolvedValue(true);
      User.updateOne.mockResolvedValue(true);

      await verifyEmail(req, res);

      expect(UserVerification.findOne).toHaveBeenCalledWith({ userId: "123" });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "valid-string",
        "hashed-string",
      );
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: "123" },
        { verified: true },
      );
      expect(res.sendFile).toHaveBeenCalled();
    });

    it("should handle expired verification link", async () => {
      req.params = { userId: "123", uniqueString: "expired-string" };
      const mockVerification = {
        userId: "123",
        uniqueString: "hashed-string",
        expiresAt: Date.now() - 10000,
      };
      UserVerification.findOne.mockResolvedValue(mockVerification);
      UserVerification.deleteOne.mockResolvedValue(true);
      User.deleteOne.mockResolvedValue(true);

      await verifyEmail(req, res);

      expect(UserVerification.deleteOne).toHaveBeenCalledWith({
        userId: "123",
      });
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: "123" });
      expect(res.redirect).toHaveBeenCalledWith(
        "/user/verified?error=true&message=Link has expired. Please sign up again",
      );
    });

    it("should handle invalid unique string", async () => {
      req.params = { userId: "123", uniqueString: "invalid-string" };
      const mockVerification = {
        userId: "123",
        uniqueString: "hashed-string",
        expiresAt: Date.now() + 10000,
      };
      UserVerification.findOne.mockResolvedValue(mockVerification);
      bcrypt.compare.mockResolvedValue(false);

      await verifyEmail(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "/user/verified?error=true&message=Invalid verification details passed. Check your inbox.",
      );
    });

    it("should handle missing verification record", async () => {
      req.params = { userId: "123", uniqueString: "valid-string" };
      UserVerification.findOne.mockResolvedValue(null);

      await verifyEmail(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "/user/verified?error=true&message=Account record doesn't exist or has been verified already. Please sign up or log in.",
      );
    });

    it("should handle errors during verification", async () => {
      req.params = { userId: "123", uniqueString: "valid-string" };
      UserVerification.findOne.mockRejectedValue(new Error("Database error"));

      await verifyEmail(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "/user/verified?error=true&message=An error occurred while checking for existing user verification record",
      );
    });
  });
});
