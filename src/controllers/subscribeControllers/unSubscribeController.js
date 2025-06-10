import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import SubscriptionVerificationToken from "../../models/subscriptionVerificationToken.js";

dotenv.config();

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);
const unsubscribeSuccessTemplatePath = resolvePath(
  "src/templates/unsubscribeSuccessTemplate.html",
);
const unsubscribeConfirmationTemplatePath = resolvePath(
  "src/templates/confirmUnsubscribeTemplate.html",
);
let emailSuccessTemplate;
let unsubscribeConfirmationTemplate;
try {
  emailSuccessTemplate = fs.readFileSync(
    unsubscribeSuccessTemplatePath,
    "utf8",
  );
  unsubscribeConfirmationTemplate = fs.readFileSync(
    unsubscribeConfirmationTemplatePath,
    "utf8",
  );
} catch (error) {
  logError("Error reading email templates", error);
}
if (!emailSuccessTemplate || !unsubscribeConfirmationTemplate) {
  throw new Error("Email templates not loaded properly");
}

export const unSubscribeController = async (req, res) => {
  try {
    const { token, subject } = req.body;
    if (!token || !subject) {
      return res.status(400).json({
        success: false,
        message: "Token and subject are required.",
      });
    }
    // Validate token format
    const tokenDoc = await SubscriptionVerificationToken.findOne({
      token,
      expiresAt: { $gt: new Date() },
      used: false,
    });
    if (!tokenDoc) {
      logInfo("Invalid or expired token. Unable to unsubscribe.");
      return res.status(401).json({
        success: false,
        message:
          "Token expired or invalid. Please request a new unsubscribe link.",
      });
    }
    // If token is valid and not revoked
    const { email: to } = tokenDoc;
    // Verify if the user exists in the subscribed list
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (!existingSubscribedUser) {
      logInfo(`User with email ${to} not found in the subscribed list.`);
      return res.status(404).json({
        success: false,
        message: "User does not exist in the subscribed list.",
      });
    }
    // Remove the user from the subscription list
    await SubscribedUser.deleteOne({ email: to });
    logInfo(`User ${to} unsubscribed successfully.`);
    // Mark the token as used and delete it
    tokenDoc.used = true;
    await tokenDoc.save();
    // Send the success email (no token included)
    await sendEmail(
      to,
      "Subscription successfully canceled",
      emailSuccessTemplate,
    );
    logInfo(`Unsubscribe success email sent to ${to}`);
    return res.status(200).json({
      success: true,
      message:
        "You have been unsubscribed successfully. A confirmation email has been sent.",
    });
  } catch (error) {
    logError("Error in unSubscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
