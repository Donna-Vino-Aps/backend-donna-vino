import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { preSubscribeController } from "../../../controllers/subscribeControllers/preSubscribeController.js";
import fs from "fs";
import { sendEmail } from "../../../util/emailUtils.js";
import User from "../../../models/users/userModels.js";
import PreSubscribedUser from "../../../models/subscribe/preSubscribe.js";

vi.mock("fs");
vi.mock("../../../util/emailUtils.js");

describe("preSubscribeController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if to, subject, or templateName is missing", async () => {
    req.body = {};
    await preSubscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "to, subject, and templateName are required",
    });
  });

  it("should return 400 if email format is invalid", async () => {
    req.body = {
      to: "invalid-email",
      subject: "Welcome",
      templateName: "welcomeTemplate",
    };

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email format.",
    });
  });

  it("should return 404 if the email template does not exist", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Welcome",
      templateName: "nonexistentTemplate",
    };

    fs.existsSync.mockReturnValue(false);

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email template not found",
    });
  });

  it("should return 500 if reading the template fails", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Welcome",
      templateName: "welcomeTemplate",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error: Failed to read template",
    });
  });

  it("should send an email if user is not found and add to PreSubscribedUser", async () => {
    req.body = {
      to: "newuser@example.com",
      subject: "Welcome",
      templateName: "welcomeTemplate",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    sendEmail.mockResolvedValue({ messageId: "12345" });

    User.findOne = vi.fn().mockResolvedValue(null);
    PreSubscribedUser.findOne = vi.fn().mockResolvedValue(null);
    PreSubscribedUser.prototype.save = vi.fn().mockResolvedValue();

    await preSubscribeController(req, res);

    expect(sendEmail).toHaveBeenCalled();
    expect(PreSubscribedUser.prototype.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "A verification email has been sent to your account.",
      }),
    );
  });

  it("should not add duplicate PreSubscribedUser if already exists", async () => {
    req.body = {
      to: "existinguser@example.com",
      subject: "Welcome",
      templateName: "welcomeTemplate",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    sendEmail.mockResolvedValue({ messageId: "12345" });

    User.findOne = vi.fn().mockResolvedValue(null);
    PreSubscribedUser.findOne = vi.fn().mockResolvedValue({ _id: "123" });

    await preSubscribeController(req, res);

    expect(PreSubscribedUser.prototype.save).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "A verification email has already been sent to your account.",
      }),
    );
  });

  it("should update user subscription if already exists in User collection", async () => {
    req.body = {
      to: "subscribeduser@example.com",
      subject: "Welcome",
      templateName: "welcomeTemplate",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    sendEmail.mockResolvedValue({ messageId: "12345" });

    const mockUser = {
      _id: "abc123",
      email: req.body.to,
      isSubscribed: false,
      save: vi.fn(),
    };
    User.findOne = vi.fn().mockResolvedValue(mockUser);

    await preSubscribeController(req, res);

    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User is subscribed successfully.",
      }),
    );
  });
});
