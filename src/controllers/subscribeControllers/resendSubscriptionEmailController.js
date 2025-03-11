import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import PreSubscribedUser from "../../models/subscribe/preSubscribeModel.js";
import User from "../../models/users/userModels.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { generateToken } from "../../services/token/tokenGenerator.js";
import validator from "validator";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";

// Helper to resolve path
const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

// Generate confirmation URL
const createConfirmSubscriptionUrl = async (email) => {
  try {
    const token = await generateToken(email);
    return `${baseDonnaVinoWebUrl}/subscription/verify?token=${token}`;
  } catch (error) {
    throw new Error("Error generating confirmation URL: " + error.message);
  }
};

export const resendSubscriptionEmailController = async (req, res) => {
  const { to } = req.body;

  // Validate email
  if (!to || !validator.isEmail(to)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required.",
    });
  }

  try {
    // Check if the user exists in PreSubscribedUser, User, or Subscribe
    const preSubscribedUser = await PreSubscribedUser.findOne({ email: to });
    const user = await User.findOne({ email: to });
    const subscribedUser = await SubscribedUser.findOne({ email: to });

    // If user exists in Subscribe, they are already confirmed
    if (subscribedUser) {
      logInfo(`User ${to} is already confirmed in Subscribe collection.`);
      return res.status(200).json({
        success: true,
        message: "You are already subscribed.",
      });
    }

    // If user doesn't exist in any collection, return error
    if (!preSubscribedUser && !user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please pre-subscribe first.",
      });
    }

    // If the user exists in User collection and is already subscribed
    if (user && user.isSubscribed) {
      logInfo(`User ${to} is already subscribed in User collection.`);
      return res.status(200).json({
        success: true,
        message: "You are already subscribed.",
      });
    }

    // Load email template
    const templatePath = resolvePath("src/templates/subscriptionEmail.html");

    if (!fs.existsSync(templatePath)) {
      logError(`Email template not found at: ${templatePath}`);
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    let emailTemplate = fs.readFileSync(templatePath, "utf-8");

    // Generate new confirmation URL
    const confirmUrl = await createConfirmSubscriptionUrl(to);
    emailTemplate = emailTemplate.replace(
      "{{CONFIRM_SUBSCRIPTION_URL}}",
      confirmUrl,
    );

    // Send the email
    await sendEmail(to, "Confirm your subscription", emailTemplate);
    logInfo(`Resent subscription confirmation email to: ${to}`);

    return res.status(200).json({
      success: true,
      message: "Subscription confirmation email resent successfully.",
    });
  } catch (error) {
    logError("Error resending subscription email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend confirmation email.",
      error: error.message || "Unknown error occurred.",
    });
  }
};
