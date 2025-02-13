import { subscribeUser } from "../../../controllers/subscribeControllers/subscribeController";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

jest.mock("nodemailer");
jest.mock("fs");
jest.mock("path");

describe("subscribeUser", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    process.env.MAIL_HOST = "smtp.example.com";
    process.env.MAIL_PORT = "587";
    process.env.MAIL_SECURE = "false";
    process.env.AUTH_EMAIL = "test@example.com";
    process.env.AUTH_PASSWORD = "password";

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("<html>Welcome {{EMAIL}}</html>");


    path.resolve.mockImplementation((...args) => args.join("/"));
    path.dirname.mockReturnValue("/mock/dir");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if email is missing", () => {
    req.body.email = "";

    subscribeUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Email is required" });
  });

  it("should return 500 if the welcome email template is not found", () => {
    fs.existsSync.mockReturnValue(false);

    subscribeUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error: Template not found",
    });
  });

  it("should return 500 if there is an error reading the welcome email template", () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error("File read error");
    });

    subscribeUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
  });

  it("should send a confirmation email and return 200 on success", () => {
    const sendMailMock = jest.fn((mailOptions, callback) => callback(null));
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    subscribeUser(req, res);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: "587",
      secure: false,
      auth: {
        user: "test@example.com",
        pass: "password",
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      {
        from: "test@example.com",
        to: "test@example.com",
        subject: "Subscription Confirmation",
        html: "<html>Welcome test@example.com</html>",
      },
      expect.any(Function),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Subscription successful! Check your email for confirmation.",
    });
  });

  it("should return 500 if there is an error sending the email", () => {
    const sendMailMock = jest.fn((mailOptions, callback) =>
      callback(new Error("Failed to send email")),
    );
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    subscribeUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to send confirmation email",
    });
  });
});
