import { contactUsEmail } from "../../util/emailUtils.js";
import { logError } from "../../util/logging.js";
import xss from "xss";
import escapeHtml from "escape-html";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;

export const contactUsController = async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({
      success: false,
      message: "name, email, phone, and message are required",
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format. Example: example@domain.com",
    });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone number format",
    });
  }

  const sanitizedName = xss(name);
  const sanitizedPhone = xss(phone);
  const sanitizedMessage = xss(message);

  const escapedName = escapeHtml(sanitizedName);
  const escapedPhone = escapeHtml(sanitizedPhone);
  const escapedMessage = escapeHtml(sanitizedMessage);

  const textMessage = `
    New Contact Request:

    Name: ${escapedName}
    Email: ${email}
    Phone: ${escapedPhone}
    Message: ${escapedMessage}
  `;

  try {
    const subject = "New Contact Request";
    const to = process.env.INFO_EMAIL;

    const data = await contactUsEmail(to, subject, textMessage, false);

    if (data.error) {
      logError("Email sending error:", data.error);
      return res.status(data.error.statusCode || 500).json({
        success: false,
        message: "Failed to send contact message",
        error: data.error.message || "Error sending email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact message sent successfully!",
      data,
    });
  } catch (error) {
    logError("Error in contactUsController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error: Failed to send contact message",
      error: error.message || "Error sending contact message",
    });
  }
};
