import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import PreSubscribedUser from "../../models/subscribe/preSubscribe.js";
import { logInfo, logError } from "../../util/logging.js";
import User from "../../models/users/userModels.js";
import validator from "validator";
import { generateToken } from "../../util/tokenUtils.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

// Function to ensure the user is in the PreSubscribedUser collection
const ensurePreSubscribedUser = async (email) => {
  let preSubscribedUser = await PreSubscribedUser.findOne({ email });

  if (!preSubscribedUser) {
    preSubscribedUser = await PreSubscribedUser.create({ email });
    logInfo(`User ${email} added to PreSubscribedUser collection.`);
  } else {
    logInfo(`User ${email} was already in PreSubscribedUser collection.`);
  }

  return preSubscribedUser;
};

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

  // Check if the template exists
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

  // Replace template variables with the provided data
  if (templateData && typeof templateData === "object") {
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      emailTemplate = emailTemplate.replace(regex, templateData[key]);
    });
  }

  try {
    // Generate the token
    const token = generateToken(to);
    const confirmUrl = `${baseDonnaVinoWebUrl}/?token=${token}`;
    emailTemplate = emailTemplate.replace(
      "{{CONFIRM_SUBSCRIPTION_URL}}",
      confirmUrl,
    );

    // Step 1: Check if the user is already in PreSubscribedUser
    const existingPreSubscribedUser = await PreSubscribedUser.findOne({
      email: to,
    });

    if (existingPreSubscribedUser) {
      logInfo(`User ${to} is already in the PreSubscribedUser collection.`);
      return res.status(200).json({
        success: true,
        message: "A verification email has already been sent to your account.",
      });
    }

    // Step 2: Check if the user is already in the User collection and if they are subscribed
    const user = await User.findOne({ email: to });

    if (user) {
      logInfo(`User ${to} exists in the User collection.`);

      if (user.isSubscribed) {
        logInfo(`User ${to} is already subscribed.`);
        return res.status(200).json({
          success: true,
          message: "You are already subscribed.",
        });
      }

      logInfo(
        `User ${to} is not subscribed, adding to PreSubscribedUser collection.`,
      );

      // If the user is no in PreSubscribe Collection we add it
      await ensurePreSubscribedUser(to);

      await sendEmail(to, subject, emailTemplate);

      logInfo(`Sending email ${to}`);

      return res.status(200).json({
        success: true,
        message: "A verification email has been sent to your account.",
      });
    }

    // Step 3: If not in any collection, add to PreSubscribedUser
    await ensurePreSubscribedUser(to);

    await sendEmail(to, subject, emailTemplate);
    logInfo(`Sending email ${to}`);

    return res.status(200).json({
      success: true,
      message: "A verification email has been sent to your account.",
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
