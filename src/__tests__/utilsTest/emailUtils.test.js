import { Resend } from "resend";
import { sendEmail } from "../../util/emailUtils";

jest.mock("resend");

describe("sendEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send an email successfully", async () => {
    const mockSend = jest.fn().mockResolvedValue({ id: "123", status: "sent" });
    Resend.prototype.emails = { send: mockSend };

    const to = "test@example.com";
    const subject = "Test Subject";
    const html = "<p>Test HTML content</p>";

    const result = await sendEmail(to, subject, html);
    expect(mockSend).toHaveBeenCalledWith({
      from: "info@donnavino.dk",
      to,
      subject,
      html,
    });
    expect(result).toEqual({ id: "123", status: "sent" });
  });

  it("should throw an error if email sending fails", async () => {
    const mockError = new Error("Failed to send email");
    const mockSend = jest.fn().mockRejectedValue(mockError);
    Resend.prototype.emails = { send: mockSend };

    const to = "test@example.com";
    const subject = "Test Subject";
    const html = "<p>Test HTML content</p>";

    await expect(sendEmail(to, subject, html)).rejects.toThrow(mockError);
    expect(mockSend).toHaveBeenCalledWith({
      from: "info@donnavino.dk",
      to,
      subject,
      html,
    });
  });
});
