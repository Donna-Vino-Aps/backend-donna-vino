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

// Mock all external dependencies
vi.mock("fs");
vi.mock("jsonwebtoken");
vi.mock("../../../util/emailUtils.js");
vi.mock("../../../models/subscribe/subscribedModel.js");
vi.mock("../../../services/token/tokenRepository.js");
vi.mock("../../../services/token/tokenGenerator.js", () => ({
  generateToken: vi.fn(),
}));

describe("unSubscribeController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mock function responses for the test cases
    sendEmail.mockResolvedValue({ messageId: "12345" });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      "Hello {{name}}! Please click here to unsubscribe: {{UNSUBSCRIBE_URL}}.",
    );
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

  it("should handle missing required fields", async () => {
    req.body = {};
    await unSubscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token and subject are required.",
    });
  });

  it("should handle invalid token and send a new confirmation email", async () => {
    req.body = {
      token: "invalidtoken",
      subject: "Unsubscribe Request",
    };

    jwt.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    await unSubscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid token structure.",
    });
  });

  it("should return 400 if token has already been used", async () => {
    req.body = {
      token: "usedtoken",
      subject: "Unsubscribe Request",
    };

    isTokenUsed.mockResolvedValue(true);
    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This unsubscribe request has already been processed.",
    });
  });

  it("should return 404 if user is not found in SubscribedUser", async () => {
    req.body = {
      token: "validtoken",
      subject: "Unsubscribe Request",
    };
    SubscribedUser.findOne.mockResolvedValue(null);
    await unSubscribeController(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User does not exist in the subscribed list.",
    });
  });

  it("should successfully unsubscribe a user and send a success email", async () => {
    req.body = {
      token: "validToken",
      subject: "Unsubscribe Request",
    };

    SubscribedUser.findOne.mockResolvedValue({ email: "test@example.com" });
    SubscribedUser.deleteOne.mockResolvedValue();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}!");
    jwt.verify.mockReturnValue({ email: "test@example.com", id: "token123" });

    await unSubscribeController(req, res);

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

  it("should return 500 if an error occurs during the unsubscribe process", async () => {
    req.body = {
      token: "validtoken",
      subject: "Unsubscribe Request",
    };

    SubscribedUser.findOne.mockRejectedValue(new Error("DB error"));

    await unSubscribeController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});
