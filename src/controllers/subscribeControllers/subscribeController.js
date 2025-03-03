import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import SubscribedUser from "../../models/users/subscribedUser.js";
import { logInfo, logError } from "../../util/logging.js";
import User from "../../models/userModels.js";
import validator from "validator";

const resolvePath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

export const subscribeController = async (req, res) => {
  const { to, subject, templateName, templateData } = req.body;

  if (!to || !subject || !templateName) {
    return res.status(400).json({
      success: false,
      message: "to, subject, and templateName are required",
    });
  }
  if (!validator.isEmail(to)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format.",
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
      const regex = new RegExp(`{{${key}}}`, "g");
      emailTemplate = emailTemplate.replace(regex, templateData[key]);
    });
  }

  try {
    // Step 1: Send the email
    const data = await sendEmail(to, subject, emailTemplate);
    if (data.error) {
      logError("Email validation error:", data.error);
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
      if (!user.isSubscribed) {
        user.isSubscribed = true;
        await user.save();
        logInfo(`User ${to} isSubscribed updated to true.`);
      } else {
        logInfo(`User ${to} was already subscribed.`);
      }

      //Don't add this email to the SubscribedUser collection
      return res.status(200).json({
        success: true,
        message: "User is subscribed successfully.",
      });
    }

    // Step 4: If the user does not exist in eCommerce, add them to SubscribedUser
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });

    if (!existingSubscribedUser) {
      const newSubscribedUser = new SubscribedUser({ email: to });
      await newSubscribedUser.save();
      logInfo(`User ${to} added to SubscribedUser collection.`);
    } else {
      logInfo(`User ${to} is already in the SubscribedUser collection.`);
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
