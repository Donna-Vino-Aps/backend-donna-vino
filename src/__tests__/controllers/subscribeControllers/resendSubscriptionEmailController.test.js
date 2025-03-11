import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { resendSubscriptionEmailController } from "../../../controllers/subscribeControllers/resendSubscriptionEmailController.js";
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
vi.mock("../../../models/users/userModels.js");
vi.mock("../../../models/subscribe/subscribeModel.js");
vi.mock("validator");
vi.mock("../../../services/token/tokenGenerator.js", () => ({
  generateToken: vi.fn(),
}));

describe("resendSubscriptionEmailController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mock defaults
    sendEmail.mockResolvedValue({ messageId: "12345" });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{CONFIRM_SUBSCRIPTION_URL}}!");
    validator.isEmail.mockReturnValue(true);

    PreSubscribedUser.findOne = vi.fn();
    User.findOne = vi.fn();
    SubscribedUser.findOne = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if email is missing or invalid", async () => {
    req.body = { to: "" };
    await resendSubscriptionEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid email is required.",
    });

    req.body = { to: "invalid-email" };
    validator.isEmail.mockReturnValue(false);

    await resendSubscriptionEmailController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid email is required.",
    });
  });

  it("should return 200 if the user is already subscribed in Subscribe collection", async () => {
    req.body = { to: "subscribed@example.com" };

    SubscribedUser.findOne.mockResolvedValue({
      _id: "sub123",
      email: req.body.to,
    });

    await resendSubscriptionEmailController(req, res);

    expect(SubscribedUser.findOne).toHaveBeenCalledWith({
      email: "subscribed@example.com",
    });
    expect(sendEmail).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "You are already subscribed.",
    });
  });

  it("should return 200 if the user is already subscribed in User collection", async () => {
    req.body = { to: "user@example.com" };

    SubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue({
      _id: "user123",
      email: req.body.to,
      isSubscribed: true,
    });

    await resendSubscriptionEmailController(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(sendEmail).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "You are already subscribed.",
    });
  });

  it("should return 404 if the user is not found in any collection", async () => {
    req.body = { to: "unknown@example.com" };

    SubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue(null);

    await resendSubscriptionEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found. Please pre-subscribe first.",
    });
  });

  it("should resend confirmation email if user is in PreSubscribedUser", async () => {
    req.body = { to: "presub@example.com" };

    const token = "testToken123";
    const expectedUrl = `${baseDonnaVinoWebUrl}/subscription/verify?token=${token}`;

    SubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue({
      _id: "pre123",
      email: req.body.to,
    });
    generateToken.mockResolvedValue(token);

    await resendSubscriptionEmailController(req, res);

    expect(sendEmail).toHaveBeenCalledWith(
      "presub@example.com",
      "Confirm your subscription",
      `Hello ${expectedUrl}!`,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Subscription confirmation email resent successfully.",
    });
  });

  it("should return 500 if an error occurs during processing", async () => {
    req.body = { to: "error@example.com" };

    SubscribedUser.findOne.mockRejectedValue(new Error("Database error"));

    await resendSubscriptionEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Failed to resend confirmation email.",
      error: "Database error",
    });
  });

  it("should return 404 if the email template does not exist", async () => {
    req.body = { to: "templatefail@example.com" };

    SubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue({
      _id: "pre123",
      email: req.body.to,
    });

    fs.existsSync.mockReturnValue(false);

    await resendSubscriptionEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email template not found.",
    });
  });

  it("should replace dynamic confirmation URL in the email template", async () => {
    req.body = { to: "test@example.com" };

    SubscribedUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PreSubscribedUser.findOne.mockResolvedValue({
      _id: "preSub123",
      email: req.body.to,
    });

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      "Hello! Click here to confirm: {{CONFIRM_SUBSCRIPTION_URL}}.",
    );

    const confirmationToken = "confirmationToken123";
    generateToken.mockResolvedValue(confirmationToken);

    const expectedUrl = `${baseDonnaVinoWebUrl}/subscription/verify?token=${confirmationToken}`;

    await resendSubscriptionEmailController(req, res);

    expect(generateToken).toHaveBeenCalledWith("test@example.com");

    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Confirm your subscription",
      `Hello! Click here to confirm: ${expectedUrl}.`,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Subscription confirmation email resent successfully.",
    });
  });
});
