import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { unSubscribeController } from "../../../controllers/subscribeControllers/unSubscribeController.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../util/emailUtils.js";
import SubscribedUser from "../../../models/subscribe/subscribedModel.js";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
} from "../../../services/token/tokenRepository.js";
import { generateToken } from "../../../services/token/tokenGenerator.js";
import { baseDonnaVinoWebUrl } from "../../../config/environment.js";

// Mock all external dependencies
vi.mock("fs");
vi.mock("jsonwebtoken");
vi.mock("../../../models/subscribe/subscribedModel.js");
vi.mock("../../../services/token/tokenRepository.js");
vi.mock("../../../services/token/tokenGenerator.js", () => ({
  generateToken: vi.fn(),
}));
vi.mock("../../../util/emailUtils.js", () => ({
  sendEmail: vi.fn(),
}));

describe("unSubscribeController", () => {
  let req, res;

  beforeEach(() => {
    req = { query: {} }; // This time using query instead of body
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
    deleteToken.mockResolvedValue(true);
    SubscribedUser.findOne = vi.fn();
    SubscribedUser.deleteOne = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle invalid or expired token", async () => {
    req.query = { token: "invalidtoken" };
    jwt.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message:
        "Your unsubscribe link has expired. A new confirmation email has been sent.",
    });
  });

  it("should return 400 if token has already been used", async () => {
    req.query = { token: "usedtoken" };
    isTokenUsed.mockResolvedValue(true); // Token already used

    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This unsubscribe request has already been processed.",
    });
  });

  it("should return 404 if user does not exist in SubscribedUser", async () => {
    req.query = { token: "validtoken" };
    SubscribedUser.findOne.mockResolvedValue(null); // User not found

    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User does not exist in the subscribed list.",
    });
  });

  it("should successfully unsubscribe a user and send a confirmation email", async () => {
    req.query = { token: "validtoken" };
    SubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.deleteOne.mockResolvedValue(true); // User deleted successfully

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    jwt.verify.mockReturnValue({ email: "test@example.com", id: "token123" });

    await unSubscribeController(req, res);

    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Subscription successfully canceled",
      "Hello {{name}}!",
    );

    expect(SubscribedUser.deleteOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });
    expect(markTokenAsUsed).toHaveBeenCalledWith("token123");
    expect(deleteToken).toHaveBeenCalledWith("token123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message:
        "You have been unsubscribed successfully. A confirmation email has been sent.",
    });
  });

  it("should return 500 if an error occurs during the process", async () => {
    req.query = { token: "validtoken" };

    // Simulate an error when deleting the user
    SubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.deleteOne.mockRejectedValue(new Error("DB error"));

    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });

  it("should replace dynamic unsubscribe URL in the template", async () => {
    req.query = { token: "validtoken" };
    SubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.deleteOne.mockResolvedValue(true);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      "Hello {{name}}! To unsubscribe click here: {{UNSUBSCRIBE_URL}}.",
    );
    jwt.verify.mockReturnValue({ email: "test@example.com", id: "token123" });

    const unsubscribeRequestToken = "unsubscribeToken123";
    vi.mocked(generateToken).mockResolvedValue(unsubscribeRequestToken);

    const unsubscribeUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeRequestToken}`;

    await unSubscribeController(req, res);

    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Subscription successfully canceled",
      `Hello {{name}}! To unsubscribe click here: ${unsubscribeUrl}.`, // updated expected string
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message:
        "You have been unsubscribed successfully. A confirmation email has been sent.",
    });
  });

  it("should handle missing token", async () => {
    req.query = {}; // Missing token
    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token is required.",
    });
  });
});
