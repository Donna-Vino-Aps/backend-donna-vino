import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { preSubscribeController } from "../../../controllers/subscribeControllers/preSubscribeController.js";
import fs from "fs";
import { sendEmail } from "../../../util/emailUtils.js";
import PreSubscribedUser from "../../../models/subscribe/preSubscribe.js";
import User from "../../../models/users/userModels.js";
import validator from "validator";
import { generateToken } from "../../../util/tokenUtils.js";

vi.mock("fs");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/subscribe/preSubscribe.js");
vi.mock("../../../models/users/userModels.js");
vi.mock("validator");
vi.mock("../../../util/tokenUtils.js", () => ({
  generateToken: vi.fn(),
}));

describe("preSubscribeController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    sendEmail.mockResolvedValue({ messageId: "12345" });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    validator.isEmail.mockReturnValue(true);

    PreSubscribedUser.findOne = vi.fn();
    PreSubscribedUser.findOneAndUpdate = vi.fn();
    User.findOne = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if to, subject, or templateName is missing", async () => {
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
      subject: "Test Subject",
      templateName: "testTemplate",
    };
    validator.isEmail.mockReturnValue(false);

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email format.",
    });
  });

  it("should return 404 if the template file does not exist", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
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

  it("should not send email if user is already subscribed in User collection", async () => {
    req.body = {
      to: "subscribed@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    PreSubscribedUser.findOne.mockResolvedValue(null);

    User.findOne.mockResolvedValue({
      _id: "user123",
      email: req.body.to,
      isSubscribed: true,
    });

    await preSubscribeController(req, res);

    expect(PreSubscribedUser.findOne).toHaveBeenCalledWith({
      email: "subscribed@example.com",
    });
    expect(User.findOne).toHaveBeenCalledWith({
      email: "subscribed@example.com",
    });

    expect(sendEmail).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "You are already subscribed.",
      user: {
        id: "user123",
        email: "subscribed@example.com",
      },
    });
  });

  it("should NOT send email if user is already in PreSubscribedUser", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
      templateData: { name: "John" },
    };

    PreSubscribedUser.findOne.mockResolvedValue({
      _id: "123",
      email: req.body.to,
    });

    await preSubscribeController(req, res);

    expect(sendEmail).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has already been sent to your account.",
      user: { id: "123", email: "test@example.com" },
    });
  });

  it("should send email if user exists in User collection but is not subscribed", async () => {
    req.body = {
      to: "notsubscribed@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    User.findOne.mockResolvedValue({
      _id: "user123",
      email: req.body.to,
      isSubscribed: false,
    });

    const newPreSubscribedUser = { _id: "preSub123", email: req.body.to };
    PreSubscribedUser.findOneAndUpdate.mockResolvedValue(newPreSubscribedUser);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");

    await preSubscribeController(req, res);

    expect(User.findOne).toHaveBeenCalledWith({
      email: "notsubscribed@example.com",
    });

    expect(PreSubscribedUser.findOneAndUpdate).toHaveBeenCalledWith({
      email: "notsubscribed@example.com",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      "notsubscribed@example.com",
      "Welcome!",
      "Hello John!",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
      user: {
        id: "preSub123",
        email: "notsubscribed@example.com",
      },
    });
  });

  it("should add new user to PreSubscribedUser and send verification email if user doesn't exist in any collection", async () => {
    req.body = {
      to: "newuser@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue(null);

    const newPreSubscribedUser = { _id: "newUser123", email: req.body.to };
    PreSubscribedUser.findOneAndUpdate.mockResolvedValue(newPreSubscribedUser);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");

    await preSubscribeController(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "newuser@example.com" });
    expect(PreSubscribedUser.findOne).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });

    expect(PreSubscribedUser.findOneAndUpdate).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      "newuser@example.com",
      "Welcome!",
      "Hello John!",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
      user: {
        id: "newUser123",
        email: "newuser@example.com",
      },
    });
  });

  it("should return 500 if sending email fails", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };

    PreSubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);

    sendEmail.mockRejectedValue(new Error("Email sending failed"));

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Failed to process subscription",
      error: "Email sending failed",
    });
  });

  it("should call generateToken when user exists but is not subscribed", async () => {
    req.body = {
      to: "notsubscribed@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    User.findOne.mockResolvedValue({
      _id: "user123",
      email: req.body.to,
      isSubscribed: false,
    });

    const newPreSubscribedUser = { _id: "preSub123", email: req.body.to };
    PreSubscribedUser.findOneAndUpdate.mockResolvedValue(newPreSubscribedUser);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");

    await preSubscribeController(req, res);

    expect(generateToken).toHaveBeenCalledWith("notsubscribed@example.com");

    expect(User.findOne).toHaveBeenCalledWith({
      email: "notsubscribed@example.com",
    });
    expect(PreSubscribedUser.findOneAndUpdate).toHaveBeenCalledWith({
      email: "notsubscribed@example.com",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      "notsubscribed@example.com",
      "Welcome!",
      "Hello John!",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
      user: {
        id: "preSub123",
        email: "notsubscribed@example.com",
      },
    });
  });
});
