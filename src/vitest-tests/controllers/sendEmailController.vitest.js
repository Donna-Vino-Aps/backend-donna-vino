import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { sendEmailController } from "../../controllers/sendEmailControllers/sendEmailController.js";
import fs from "fs";
import { sendEmail } from "../../util/emailUtils.js";
import { Resend } from "resend";
import User from "../../models/userModels.js";
import SubscribedUser from "../../models/subscribedUser.js";

vi.mock("fs");
vi.mock("path");
vi.mock("../../util/emailUtils.js");
vi.mock("resend");
vi.mock("../../controllers/authControllers/emailWelcomeController.js", () => ({
  sendWelcomeEmail: vi.fn(),
}));

describe("sendEmailController", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    Resend.mockImplementation(() => ({
      sendEmail: vi.fn().mockResolvedValue({ messageId: "12345" }),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if to, subject, or templateName is missing", async () => {
    req.body = {};
    await sendEmailController(req, res);
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
    await sendEmailController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message:
        "Invalid email format. Example of a valid email: example@domain.com",
    });
  });

  it("should return 404 if the template file does not exist", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "nonexistentTemplate",
    };
    fs.existsSync.mockReturnValue(false);
    await sendEmailController(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email Template not found",
    });
  });

  it("should return 500 if there is an error reading the template file", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });
    await sendEmailController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error: Failed to read template",
    });
  });

  it("should replace template placeholders with templateData", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
      templateData: { name: "John Doe" },
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello {{name}}");
    await sendEmailController(req, res);
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Test Subject",
      "Hello John Doe",
    );
  });

  it("should send an email successfully and return 200", async () => {
    console.log("Starting test...");
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello World");
    console.log("Mocks set up...");
    sendEmail.mockResolvedValue({ messageId: "12345" });
    console.log("sendEmail mocked...");
    await sendEmailController(req, res);
    console.log("sendEmailController called...");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Email sent successfully! Check your email for confirmation.",
    });
    console.log("Test assertions passed...");
  });

  it("should return 500 if sending the email fails", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello World");
    sendEmail.mockRejectedValue(new Error("Failed to send email"));
    await sendEmailController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Failed to send confirmation email",
      error: "Failed to send email",
    });
  });

  it("should add user to SubscribedUser collection if email sent successfully", async () => {
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello World");
    sendEmail.mockResolvedValue({ messageId: "12345" });

    // Mocking user model
    const user = {
      _id: "userId",
      email: "test@example.com",
      isSubscribed: false,
      save: vi.fn(),
    };

    User.findOne = vi.fn().mockResolvedValue(user);
    SubscribedUser.findOne = vi.fn().mockResolvedValue(null);
    SubscribedUser.prototype.save = vi.fn().mockResolvedValue();

    await sendEmailController(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(user.save).toHaveBeenCalled();
    expect(SubscribedUser.prototype.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
