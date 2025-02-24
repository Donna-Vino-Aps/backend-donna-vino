import { sendEmail } from "../../util/emailUtils.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const textMessage = `
    New Contact Request:

    Name: ${name}
    Email: ${email}
    Phone: ${phone}
    Message: ${message}
  `;

  try {
    const subject = "New Contact Request";
    const to = process.env.CONTACT_RECEIVER_EMAIL;

    const data = await sendEmail(to, subject, textMessage);

    if (data.error) {
      console.error("Email sending error:", data.error);
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
    console.error("Error in contactUsController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error: Failed to send contact message",
      error: error.message || "Error sending contact message",
    });
  }
};
