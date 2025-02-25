import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, expect, vi } from "vitest";
import { Resend } from "resend";
import { contactUsEmail } from "../../util/emailUtils.js";

vi.mock("resend");

describe("contactUsEmail", () => {
  const mockContactEmail = "contact@example.com";
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.INFO_EMAIL = mockContactEmail;
    process.env.RESEND_API_KEY = mockApiKey;
  });

  it("should send a contact email successfully", async () => {
    const mockSend = vi.fn().mockResolvedValue({ id: "456", status: "sent" });
    Resend.prototype.emails = { send: mockSend };

    const to = "info@example.com";
    const subject = "Contact Form Submission";
    const html = "<p>User message content</p>";

    const result = await contactUsEmail(to, subject, html);

    expect(mockSend).toHaveBeenCalledWith({
      from: `"Donna Vino" <${process.env.INFO_EMAIL}>`,
      to,
      subject,
      html,
    });
    expect(result).toEqual({ id: "456", status: "sent" });
  });

  it("should throw an error if contact email sending fails", async () => {
    const mockError = new Error("Failed to send contact email");
    const mockSend = vi.fn().mockRejectedValue(mockError);
    Resend.prototype.emails = { send: mockSend };

    const to = "info@example.com";
    const subject = "Contact Form Submission";
    const html = "<p>User message content</p>";

    await expect(contactUsEmail(to, subject, html)).rejects.toThrow(mockError);

    expect(mockSend).toHaveBeenCalledWith({
      from: `"Donna Vino" <${process.env.INFO_EMAIL}>`,
      to,
      subject,
      html,
    });
  });
});
