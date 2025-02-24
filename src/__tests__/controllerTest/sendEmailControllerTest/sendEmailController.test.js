import { sendEmailController } from "../../../controllers/sendEmailControllers/sendEmailController.js";
import fs from "fs";
import { sendEmail } from "../../../util/emailUtils";
import { Resend } from "resend";

jest.mock("fs");
jest.mock("path");
jest.mock("../../../util/emailUtils");
jest.mock("resend");

describe("sendEmailController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    Resend.mockImplementation(() => {
      return {
        sendEmail: jest.fn().mockResolvedValue({ messageId: "12345" }),
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    req.body = {
      to: "test@example.com",
      subject: "Test Subject",
      templateName: "testTemplate",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("Hello World");
    sendEmail.mockResolvedValue({ messageId: "12345" });

    await sendEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Email sent successfully! Check your email for confirmation.",
      data: { messageId: "12345" },
    });
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
});
