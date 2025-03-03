import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import PreSubscribedUser from "../../models/subscribe/preSubscribe.js";
import { logInfo, logError } from "../../util/logging.js";
import User from "../../models/users/userModels.js";
import validator from "validator";

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

export const preSubscribeController = async (req, res) => {
  const { to, subject, templateName, templateData } = req.body;

  // Validate required fields
  if (!to || !subject || !templateName) {
    return res.status(400).json({
      success: false,
      message: "to, subject, and templateName are required",
    });
  }

  // Validate email format
  if (!validator.isEmail(to)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format.",
    });
  }

  const templatePath = resolvePath(`src/templates/${templateName}.html`);

  // Check if the email template exists
  if (!fs.existsSync(templatePath)) {
    logError(`Email template not found at: ${templatePath}`);
    return res.status(404).json({
      success: false,
      message: "Email template not found",
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

  // Replace template variables with provided data
  if (templateData && typeof templateData === "object") {
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      emailTemplate = emailTemplate.replace(regex, templateData[key]);
    });
  }

  try {
    // Check if the user already exists in the main User collection
    const user = await User.findOne({ email: to });

    if (user) {
      if (!user.isSubscribed) {
        user.isSubscribed = true;
        await user.save();
        logInfo(`User ${to} isSubscribed updated to true.`);
      } else {
        logInfo(`User ${to} was already subscribed.`);
      }

      return res.status(200).json({
        success: true,
        message: "User is subscribed successfully.",
        user: { id: user._id, email: user.email },
      });
    }

    // Check if the user already exists in the PreSubscribedUser collection
    const existingPreSubscribedUser = await PreSubscribedUser.findOne({
      email: to,
    });

    if (existingPreSubscribedUser) {
      logInfo(`User ${to} is already in the PreSubscribedUser collection.`);
      return res.status(200).json({
        success: true,
        message: "A verification email has already been sent to your account.",
        user: {
          id: existingPreSubscribedUser._id,
          email: existingPreSubscribedUser.email,
        },
      });
    }

    // Send verification email only if the user doesn't exist
    const data = await sendEmail(to, subject, emailTemplate);

    if (data.error) {
      logError("Email sending error:", data.error);
      return res.status(data.error.statusCode || 500).json({
        success: false,
        message: "Failed to send email",
        error: data.error.message || "Failed to send email",
      });
    }

    // Add new user to PreSubscribedUser collection
    const newPreSubscribedUser = new PreSubscribedUser({ email: to });
    await newPreSubscribedUser.save();
    logInfo(`User ${to} added to PreSubscribedUser collection.`);

    return res.status(200).json({
      success: true,
      message: "A verification email has been sent to your account.",
      user: { id: newPreSubscribedUser._id, email: newPreSubscribedUser.email },
    });
  } catch (error) {
    logError("Error processing subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process subscription",
      error: error.message || "Unknown error occurred",
    });
  }
};
