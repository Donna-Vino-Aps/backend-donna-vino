import { describe, it, expect, vi, beforeEach } from "vitest";
import { contactUsController } from "../../../controllers/contactUsController/contactUsController";
import { contactUsEmail } from "../../../util/emailUtils";
import express from "express";
import request from "supertest";

vi.mock("../../../util/emailUtils", () => ({
  contactUsEmail: vi.fn(),
}));

const app = express();
app.use(express.json());
app.post("/api/contact-us", contactUsController);

describe("contactUsController Tests", () => {
  const validRequestBody = {
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    message: "I need help with my order.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFO_EMAIL = "info@donnavino.dk";
  });

  it("should return 400 if any required field is missing", async () => {
    const invalidBody = { ...validRequestBody };
    delete invalidBody.name;

    const response = await request(app)
      .post("/api/contact-us")
      .send(invalidBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "name, email, phone, and message are required",
    );
  });

  it("should return 400 if email format is invalid", async () => {
    const invalidBody = { ...validRequestBody, email: "invalid-email" };

    const response = await request(app)
      .post("/api/contact-us")
      .send(invalidBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Invalid email format. Example: example@domain.com",
    );
  });

  it("should call contactUsEmail with correct parameters", async () => {
    contactUsEmail.mockResolvedValueOnce({ messageId: "12345" });

    const response = await request(app)
      .post("/api/contact-us")
      .send(validRequestBody);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Contact message sent successfully!");

    // Ensure that contactUsEmail was called with the correct parameters
    expect(contactUsEmail).toHaveBeenCalledWith(
      process.env.INFO_EMAIL, // 'to' address
      "New Contact Request", // 'subject'
      expect.stringContaining("Name: John Doe"), // Ensure the message contains the user's details
      false, // 'isHtml'
    );
  });

  it("should return 500 if contactUsEmail throws an error", async () => {
    contactUsEmail.mockRejectedValueOnce(new Error("Email service down"));

    const response = await request(app)
      .post("/api/contact-us")
      .send(validRequestBody);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Internal server error: Failed to send contact message",
    );
    expect(response.body.error).toBe("Email service down");
  });

  it("should return the correct error if contactUsEmail responds with an error object", async () => {
    contactUsEmail.mockResolvedValueOnce({
      error: { statusCode: 502, message: "Bad Gateway" },
    });

    const response = await request(app)
      .post("/api/contact-us")
      .send(validRequestBody);

    expect(response.status).toBe(502);
    expect(response.body.message).toBe("Failed to send contact message");
    expect(response.body.error).toBe("Bad Gateway");
  });
});
