import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import SubscribedUser from "../../models/SubscribedUser.js";
import { logInfo } from "../../util/logging.js";
import User from "../../models/userModels.js";

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
    console.error(`Email template not found at: ${templatePath}`);
    return res.status(404).json({
      success: false,
      message: "Email Template not found",
    });
  }

  let emailTemplate;
  try {
    emailTemplate = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    console.error(`Error reading email template: ${error.message}`);
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
    // Step 1: Send the email
    const data = await sendEmail(to, subject, emailTemplate);
    if (data.error) {
      console.error("Email validation error:", data.error);
      return res.status(data.error.statusCode || 500).json({
        success: false,
        message: "Failed to send email",
        error: data.error.message || "Failed to send email",
      });
    }

    // Step 2: Check if the email exists in the User collection in eCommerce
    const user = await User.findOne({ email: to });

    if (user) {
      // Step 3: If the user exists in eCommerce, update isSubscribed to true
      user.isSubscribed = true;
      await user.save();
      logInfo(`User ${to} isSubscribed updated to true.`);

      // Step 4: Add the user to the SubscribedUser collection with userId from eCommerce
      const existingSubscribedUser = await SubscribedUser.findOne({
        email: to,
      });
      if (existingSubscribedUser) {
        logInfo(`User ${to} is already in the SubscribedUser collection.`);
      } else {
        const newSubscribedUser = new SubscribedUser({
          email: to,
          userId: user._id,
        });
        await newSubscribedUser.save();
        logInfo(
          `User ${to} added to SubscribedUser collection with userId from eCommerce.`,
        );
      }
    } else {
      // Step 5: If the user does not exist in eCommerce, add them to SubscribedUser without userId
      const existingSubscribedUser = await SubscribedUser.findOne({
        email: to,
      });
      if (existingSubscribedUser) {
        console.warn(`User ${to} is already in the SubscribedUser collection.`);
      } else {
        const newSubscribedUser = new SubscribedUser({
          email: to,
        });
        await newSubscribedUser.save();
        logInfo(
          `User ${to} added to SubscribedUser collection without userId in eCommerce.`,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully! Check your email for confirmation.",
      data,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send confirmation email",
      error: error.message || "Failed to send confirmation email",
    });
  }
};
