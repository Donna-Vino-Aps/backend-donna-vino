import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import { logError } from "../../util/logging.js";

const resolvePath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendEmailController = async (req, res) => {
  const { to, subject, templateName, templateData } = req.body;

  if (!to || !subject || !templateName) {
    return res.status(400).json({
      success: false,
      message: "to, subject, and templateName are required",
    });
  }

  if (!emailRegex.test(to)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid email format. Example of a valid email: example@domain.com",
    });
  }

  const templatePath = resolvePath(`src/templates/${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    logError(`Email template not found at: ${templatePath}`);
    return res.status(404).json({
      success: false,
      message: "Email Template not found",
    });
  }

  let emailTemplate;
  try {
    emailTemplate = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    logError(`Error reading email template: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error: Failed to read template",
    });
  }

  if (templateData && typeof templateData === "object") {
    Object.keys(templateData).forEach((key) => {
      emailTemplate = emailTemplate.replace(`{{${key}}}`, templateData[key]);
    });
  }

  try {
    const data = await sendEmail(to, subject, emailTemplate);
    if (data.error) {
      logError("Email validation error:", data.error);
      return res.status(data.error.statusCode || 500).json({
        success: false,
        message: "Failed to send email",
        error: data.error.message || "Failed to send email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully! Check your email for confirmation.",
    });
  } catch (error) {
    logError("Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send confirmation email",
      error: error.message || "Failed to send confirmation email",
    });
  }
};
