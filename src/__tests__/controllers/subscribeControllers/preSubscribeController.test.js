import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { preSubscribeController } from "../../../controllers/subscribeControllers/preSubscribeController.js";
import fs from "fs";
import { sendEmail } from "../../../util/emailUtils.js";
import PreSubscribedUser from "../../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../../models/subscribe/subscribedModel.js";
import User from "../../../models/users/userModels.js";
import validator from "validator";
import { generateToken } from "../../../services/token/tokenGenerator.js";
import { baseDonnaVinoWebUrl } from "../../../config/environment.js";

vi.mock("fs");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/subscribe/preSubscribeModel.js");
vi.mock("../../../models/subscribe/subscribedModel.js");
vi.mock("../../../models/users/userModels.js");
vi.mock("validator");
vi.mock("../../../services/token/tokenGenerator.js", () => ({
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
    PreSubscribedUser.create = vi.fn();
    SubscribedUser.findOne = vi.fn();
    User.findOne = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if 'to', 'subject', or 'templateName' is missing", async () => {
    // No fields provided
    await preSubscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "to, subject, and templateName are required",
    });
  });

  it("should return 400 if email format is invalid", async () => {
    // Invalid email format
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
    // Template does not exist
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

  it("should not send email if user is already subscribed in the User collection", async () => {
    // User already subscribed
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
    });
  });

  it("should NOT send email if user is already in PreSubscribedUser", async () => {
    // User already exists in PreSubscribedUser
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
    });
  });

  it("should send email if user exists in User collection but is not subscribed", async () => {
    // User exists but is not subscribed
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

    PreSubscribedUser.findOne.mockResolvedValue(null); // Simulate not existing
    PreSubscribedUser.create.mockResolvedValue({
      _id: "preSub123",
      email: req.body.to,
    });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");

    await preSubscribeController(req, res);

    expect(generateToken).toHaveBeenCalledWith("notsubscribed@example.com"); // Check if token is generated

    expect(PreSubscribedUser.findOne).toHaveBeenCalledWith({
      email: "notsubscribed@example.com",
    });

    expect(PreSubscribedUser.create).toHaveBeenCalledWith({
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
    });
  });

  it("should add a new user to PreSubscribedUser and send a verification email if the user doesn't exist in any collection", async () => {
    // User doesn't exist in either collection
    req.body = {
      to: "newuser@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    // Mock the response when finding users and pre-subscribed users
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue(null);

    // Mock the creation of the PreSubscribedUser
    PreSubscribedUser.create.mockResolvedValue({
      _id: "newUser123",
      email: req.body.to,
    });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");

    // Call the controller
    await preSubscribeController(req, res);

    // Check that token generation was called
    expect(generateToken).toHaveBeenCalledWith("newuser@example.com");

    // Check that the necessary functions were called
    expect(User.findOne).toHaveBeenCalledWith({ email: "newuser@example.com" });
    expect(PreSubscribedUser.findOne).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });

    // Now expect the new user to be created, not updated
    expect(PreSubscribedUser.create).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });

    // Ensure that the email was sent
    expect(sendEmail).toHaveBeenCalledWith(
      "newuser@example.com",
      "Welcome!",
      "Hello John!",
    );

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
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

  it("should replace dynamic confirmation URL in the email template", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Confirm your subscription",
      templateName: "confirmationTemplate",
      templateData: { name: "John" },
    };

    PreSubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.create.mockResolvedValue({
      _id: "preSub123",
      email: req.body.to,
    });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      "Hello {{name}}! Click here to confirm: {{CONFIRM_SUBSCRIPTION_URL}}.",
    );

    const confirmationToken = "confirmationToken123";
    vi.mocked(generateToken).mockResolvedValue(confirmationToken);

    const expectedUrl = `${baseDonnaVinoWebUrl}/subscription/verify?token=${confirmationToken}`;

    await preSubscribeController(req, res);

    expect(generateToken).toHaveBeenCalledWith("test@example.com");

    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Confirm your subscription",
      `Hello John! Click here to confirm: ${expectedUrl}.`,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
    });
  });

  it("should return 200 if user is already subscribed in SubscribedUser", async () => {
    req.body = {
      to: "subscribed@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
    };

    SubscribedUser.findOne.mockResolvedValue({
      _id: "subscribed123",
      email: req.body.to,
    });

    await preSubscribeController(req, res);

    expect(SubscribedUser.findOne).toHaveBeenCalledWith({
      email: "subscribed@example.com",
    });

    expect(sendEmail).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User is already subscribed.",
    });
  });

  it("should check SubscribedUser before adding to PreSubscribedUser", async () => {
    req.body = {
      to: "newuser@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
      templateData: { name: "John" },
    };

    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue(null);
    SubscribedUser.findOne.mockResolvedValue(null);

    PreSubscribedUser.create.mockResolvedValue({
      _id: "newUser123",
      email: req.body.to,
    });

    const confirmationToken = "confirmationToken123";
    vi.mocked(generateToken).mockResolvedValue(confirmationToken);

    await preSubscribeController(req, res);

    expect(SubscribedUser.findOne).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });
    expect(PreSubscribedUser.create).toHaveBeenCalledWith({
      email: "newuser@example.com",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      "newuser@example.com",
      "Welcome!",
      expect.stringContaining("Hello John!"),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has been sent to your account.",
    });
  });

  it("should return 500 if an error occurs while processing", async () => {
    req.body = {
      to: "error@example.com",
      subject: "Test Error",
      templateName: "errorTemplate",
    };

    SubscribedUser.findOne.mockRejectedValue(new Error("DB Error"));

    await preSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Failed to process subscription",
      error: "DB Error",
    });
  });

  it("should not generate a token if the user is already in PreSubscribedUser", async () => {
    // User already in PreSubscribedUser
    req.body = {
      to: "test@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
    };

    // Mock the response from PreSubscribedUser
    PreSubscribedUser.findOne.mockResolvedValue({
      _id: "preSub123",
      email: req.body.to,
    });

    await preSubscribeController(req, res);

    // Ensure token is not generated
    expect(generateToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "A verification email has already been sent to your account.",
    });
  });

  it("should not generate a token if the user is already in SubscribedUser", async () => {
    // User already subscribed
    req.body = {
      to: "subscribed@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
    };

    // Mock the response from SubscribedUser
    SubscribedUser.findOne.mockResolvedValue({
      _id: "subscribed123",
      email: req.body.to,
    });

    await preSubscribeController(req, res);

    // Ensure token is not generated
    expect(generateToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User is already subscribed.",
    });
  });

  it("should not generate a token if the user is already subscribed in the User collection", async () => {
    // User exists and is already subscribed
    req.body = {
      to: "subscribeduser@example.com",
      subject: "Welcome!",
      templateName: "welcomeTemplate",
    };

    // Mock the response from User
    User.findOne.mockResolvedValue({
      _id: "user123",
      email: req.body.to,
      isSubscribed: true,
    });

    await preSubscribeController(req, res);

    // Ensure token is not generated
    expect(generateToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "You are already subscribed.",
    });
  });
});
