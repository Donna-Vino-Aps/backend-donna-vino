import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { describe, it, beforeEach, expect, vi } from "vitest";
import {
  sendEmail,
  updateContactStatus,
  addContactToResend,
} from "../../util/emailUtils.js";
// Create a shared mock instance for Resend
const mResend = {
  emails: {
    send: vi.fn(),
  },
  contacts: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

// Mock the Resend module so that every new instance returns the shared mResend
vi.mock("resend", () => {
  return {
    Resend: vi.fn(() => mResend),
  };
});

describe("sendEmail", () => {
  const mockFromEmail = "mock@example.com";
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NO_REPLY_EMAIL = mockFromEmail;
    process.env.RESEND_API_KEY = mockApiKey;
  });

  it("should send an email successfully", async () => {
    mResend.emails.send.mockResolvedValue({ id: "123", status: "sent" });

    const to = "test@example.com";
    const subject = "Test Subject";
    const html = "<p>Test HTML content</p>";

    const result = await sendEmail(to, subject, html);

    expect(mResend.emails.send).toHaveBeenCalledWith({
      from: `"Donna Vino" <${process.env.NO_REPLY_EMAIL}>`,
      to,
      subject,
      html,
    });
    expect(result).toEqual({ id: "123", status: "sent" });
  });

  it("should throw an error if email sending fails", async () => {
    const mockError = new Error("Failed to send email");
    mResend.emails.send.mockRejectedValue(mockError);

    const to = "test@example.com";
    const subject = "Test Subject";
    const html = "<p>Test HTML content</p>";

    await expect(sendEmail(to, subject, html)).rejects.toThrow(mockError);
    expect(mResend.emails.send).toHaveBeenCalledWith({
      from: `"Donna Vino" <${process.env.NO_REPLY_EMAIL}>`,
      to,
      subject,
      html,
    });
  });
});

describe("updateContactStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_AUDIENCE_ID = "test-audience-id";
  });

  it("should update contact status to subscribed", async () => {
    mResend.contacts.update.mockResolvedValue({
      id: "contact-id",
      unsubscribed: false,
    });

    const result = await updateContactStatus({
      email: "test@example.com",
      unsubscribed: false,
    });
    expect(mResend.contacts.update).toHaveBeenCalledWith({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      unsubscribed: false,
      email: "test@example.com",
    });
    expect(result).toEqual({ id: "contact-id", unsubscribed: false });
  });

  it("should update contact status to unsubscribed", async () => {
    mResend.contacts.update.mockResolvedValue({
      id: "contact-id",
      unsubscribed: true,
    });

    const result = await updateContactStatus({
      email: "test@example.com",
      unsubscribed: true,
    });
    expect(mResend.contacts.update).toHaveBeenCalledWith({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      unsubscribed: true,
      email: "test@example.com",
    });
    expect(result).toEqual({ id: "contact-id", unsubscribed: true });
  });

  it("should throw an error when update fails", async () => {
    mResend.contacts.update.mockRejectedValue(new Error("update failed"));

    await expect(
      updateContactStatus({ email: "test@example.com", unsubscribed: false }),
    ).rejects.toThrow("update failed");
  });
});

describe("addContactToResend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_AUDIENCE_ID = "test-audience-id";
  });

  it("should create a new contact and update its status to subscribed", async () => {
    mResend.contacts.create.mockResolvedValue({
      id: "new-contact",
      unsubscribed: false,
    });
    mResend.contacts.update.mockResolvedValue({
      id: "new-contact",
      unsubscribed: false,
    });

    const result = await addContactToResend("test@example.com");

    expect(mResend.contacts.create).toHaveBeenCalledWith({
      email: "test@example.com",
      unsubscribed: false,
      audienceId: process.env.RESEND_AUDIENCE_ID,
    });
    expect(mResend.contacts.update).toHaveBeenCalledWith({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      unsubscribed: false,
      email: "test@example.com",
    });
    expect(result).toEqual({ id: "new-contact", unsubscribed: false });
  });

  it("should update an existing contact to subscribed when creation fails due to already exists", async () => {
    mResend.contacts.create.mockRejectedValue({
      error: { message: "already exists" },
    });
    mResend.contacts.update.mockResolvedValue({
      id: "existing-contact",
      unsubscribed: false,
    });

    const result = await addContactToResend("test@example.com");

    expect(mResend.contacts.create).toHaveBeenCalledWith({
      email: "test@example.com",
      unsubscribed: false,
      audienceId: process.env.RESEND_AUDIENCE_ID,
    });
    expect(mResend.contacts.update).toHaveBeenCalledWith({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      unsubscribed: false,
      email: "test@example.com",
    });
    expect(result).toEqual({ id: "existing-contact", unsubscribed: false });
  });

  it("should throw an error when creation fails with a non 'already exists' error", async () => {
    const mockError = { error: { message: "some other error" } };
    mResend.contacts.create.mockRejectedValue(mockError);

    await expect(addContactToResend("test@example.com")).rejects.toEqual(
      mockError,
    );
  });
});
