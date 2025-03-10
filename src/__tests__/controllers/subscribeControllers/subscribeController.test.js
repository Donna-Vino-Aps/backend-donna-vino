import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { subscribeController } from "../../../controllers/subscribeControllers/subscribeController.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../util/emailUtils.js";
import PreSubscribedUser from "../../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../../models/subscribe/subscribedModel.js";
import {
  isTokenUsed,
  markTokenAsUsed,
} from "../../../services/token/tokenRepository.js";
import path from "path";

// Mock all external dependencies
vi.mock("fs");
vi.mock("jsonwebtoken");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/subscribe/preSubscribeModel.js");
vi.mock("../../../models/subscribe/subscribedModel.js");
vi.mock("../../../services/token/tokenRepository.js");

describe("subscribeController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mock function responses for the test cases
    sendEmail.mockResolvedValue({ messageId: "12345" });
    fs.existsSync.mockReturnValue(true); // Ensure template exists
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    jwt.verify.mockReturnValue({ email: "test@example.com", id: "token123" });
    isTokenUsed.mockResolvedValue(false); // Token is not used
    markTokenAsUsed.mockResolvedValue();
    PreSubscribedUser.findOne = vi.fn();
    PreSubscribedUser.deleteOne = vi.fn();
    SubscribedUser.findOne = vi.fn();
    SubscribedUser.create = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle missing required fields", async () => {
    req.body = {};
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token, subject, and templateName are required.",
    });
  });

  it("should handle invalid template name", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "invalid@name",
    };
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid template name.",
    });
  });

  it("should return 404 if template not found", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "nonexistentTemplate",
    };
    fs.existsSync.mockReturnValue(false);
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email template not found",
    });
  });

  it("should handle token verification and return 401 if token is invalid", async () => {
    req.body = {
      token: "invalidtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };
    jwt.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token.",
    });
  });

  it("should return 400 if token has already been used", async () => {
    req.body = {
      token: "usedtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };
    isTokenUsed.mockResolvedValue(true);
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This token has already been used.",
    });
  });

  it("should return 404 if user is not found in PreSubscribedUser", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };
    PreSubscribedUser.findOne.mockResolvedValue(null);
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found in PreSubscribedUser",
    });
  });

  it("should return 200 if user is already subscribed", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };
    PreSubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    await subscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User is already subscribed.",
    });
  });

  it("should successfully subscribe a new user and send a welcome email", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };

    PreSubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.findOne.mockResolvedValue(null);

    SubscribedUser.create.mockResolvedValue({ email: "test@example.com" });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    jwt.verify.mockReturnValue({ email: "test@example.com", id: "token123" });

    await subscribeController(req, res);

    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Welcome!",
      "Hello {{name}}!",
    );

    expect(PreSubscribedUser.deleteOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });

    expect(markTokenAsUsed).toHaveBeenCalledWith("token123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Subscription confirmed and welcome email sent.",
    });
  });

  it("should return 500 if an error occurs during the process", async () => {
    req.body = {
      token: "validtoken",
      subject: "Welcome!",
      templateName: "emailWelcomeTemplate",
    };

    PreSubscribedUser.findOne.mockRejectedValue(new Error("DB error"));

    await subscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});
