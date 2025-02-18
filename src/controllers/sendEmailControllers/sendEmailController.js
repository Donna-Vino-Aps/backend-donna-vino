import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";

const resolvePath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

export const sendEmailController = async (req, res) => {
  const { to, subject, templateName, templateData } = req.body;

  if (!to || !subject || !templateName) {
    return res
      .status(400)
      .json({ error: "to, subject, and templateName are required" });
  }

  const templatePath = resolvePath(`src/templates/${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Email template not found at: ${templatePath}`);
    return res.status(500).json({
      error: "Internal server error: Template not found",
    });
  }

  let emailTemplate;
  try {
    emailTemplate = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    console.error(`Error reading email template: ${error.message}`);
    return res.status(500).json({
      error: "Internal server error",
    });
  }

  if (templateData && typeof templateData === "object") {
    Object.keys(templateData).forEach((key) => {
      emailTemplate = emailTemplate.replace(`{{${key}}}`, templateData[key]);
    });
  }
  try {
    const data = await sendEmail(to, subject, emailTemplate);
    res.status(200).json({
      success: true,
      message: "Email sent successfully! Check your email for confirmation.",
      data,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send confirmation email",
      error: error.message || "Failed to send confirmation email",
    });
  }
};
