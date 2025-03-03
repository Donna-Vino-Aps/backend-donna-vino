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
    // Check if the user already exists in the User collection
    const user = await User.findOne({ email: to });

    if (user) {
      logInfo(`User ${to} exists in the User collection.`);

      // If the user is already subscribed, inform the user
      if (user.isSubscribed) {
        logInfo(`User ${to} is already subscribed.`);
        return res.status(200).json({
          success: true,
          message: "You are already subscribed.",
          user: { id: user._id, email: user.email },
        });
      }

      // If the user is not subscribed, move to PreSubscribedUser collection
      logInfo(
        `User ${to} is not subscribed, moving to PreSubscribedUser collection.`,
      );

      // Save the user in the PreSubscribedUser collection
      const newPreSubscribedUser = new PreSubscribedUser({ email: to });
      await newPreSubscribedUser.save();
      logInfo(`User ${to} added to PreSubscribedUser collection.`);

      // Return the message
      return res.status(200).json({
        success: true,
        message: "A confirmation email has been sent.",
        user: { id: user._id, email: user.email },
      });
    }

    // Check if the user already exists in the PreSubscribedUser collection
    const existingPreSubscribedUser = await PreSubscribedUser.findOne({
      email: to,
    });

    if (existingPreSubscribedUser) {
      logInfo(`User ${to} is already in the PreSubscribedUser collection.`);

      // Send confirmation email to the user
      await sendEmail(to, subject, emailTemplate);
      return res.status(200).json({
        success: true,
        message: "A verification email has already been sent to your account.",
        user: {
          id: existingPreSubscribedUser._id,
          email: existingPreSubscribedUser.email,
        },
      });
    }

    // If the user doesn't exist in either collection, add to PreSubscribedUser collection
    const newPreSubscribedUser = new PreSubscribedUser({ email: to });
    await newPreSubscribedUser.save();
    logInfo(`User ${to} added to PreSubscribedUser collection.`);

    // Send verification email to the user
    await sendEmail(to, subject, emailTemplate);

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
