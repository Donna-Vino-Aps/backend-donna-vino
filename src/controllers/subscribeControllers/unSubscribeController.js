import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
} from "../../services/token/tokenRepository.js";
import { generateToken } from "../../services/token/tokenGenerator.js";
import path from "path";
import fs from "fs";
import { baseApiUrl, baseDonnaVinoWebUrl } from "../../config/environment.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

// Helper function to read email templates
const readTemplate = (templatePath) => {
  try {
    return fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    logError(`Error reading template at ${templatePath}: ${error.message}`);
    throw new Error("Failed to read template");
  }
};

// Helper function to create the unsubscribe URL
const createUnsubscribeUrl = (email) => {
  const unsubscribeRequestToken = generateToken(email); // Token expires in 15 minutes by default
  return `${baseApiUrl}/api/subscribe/un-subscribe?token=${unsubscribeRequestToken}`;
};

export const unSubscribeController = async (req, res) => {
  try {
    const unsubscribeSuccessTemplatePath = resolvePath(
      "src/templates/unsubscribeSuccessTemplate.html",
    );
    const unsubscribeConfirmationTemplatePath = resolvePath(
      "src/templates/unsubscribeConfirmation.html",
    );

    let emailTemplate;
    let unsubscribeConfirmationTemplate;
    try {
      emailTemplate = readTemplate(unsubscribeSuccessTemplatePath);
      unsubscribeConfirmationTemplate = readTemplate(
        unsubscribeConfirmationTemplatePath,
      );
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error: Failed to read template",
      });
    }

    const { token } = req.query;
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);

      const { email: to } = decoded || {};

      // Handle expired token - generate a new one and send confirmation email
      const unsubscribeRequestUrl = createUnsubscribeUrl(to);

      const newExpiredEmail = unsubscribeConfirmationTemplate.replace(
        "{{UNSUBSCRIBE_URL}}",
        unsubscribeRequestUrl,
      );

      await sendEmail(to, "Confirm your unsubscribe request", newExpiredEmail);

      logInfo(`Unsubscribe request email sent to ${to}`);

      return res.status(401).json({
        success: false,
        message:
          "Your unsubscribe link has expired. A new confirmation email has been sent.",
      });
    }

    // Token is valid, proceed with the unsubscribe process
    const { email: to, id: tokenId } = decoded;

    // Check if the token has already been used
    const tokenUsed = await isTokenUsed(tokenId);
    if (tokenUsed) {
      return res.status(400).json({
        success: false,
        message: "This unsubscribe request has already been processed.",
      });
    }

    // Check if the user exists in SubscribedUser collection
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (!existingSubscribedUser) {
      return res.status(400).json({
        success: false,
        message: "User does not exist in the subscribed list.",
      });
    }

    // Remove user from SubscribedUser collection
    await SubscribedUser.deleteOne({ email: to });

    logInfo(`User ${to} unsubscribed successfully.`);

    // Mark the token as used and delete it
    await markTokenAsUsed(tokenId);
    await deleteToken(tokenId);

    // Generate a new token for future unsubscribe requests
    const unsubscribeRequestUrl = createUnsubscribeUrl(to);
    const homeUrl = `${baseDonnaVinoWebUrl}`;

    emailTemplate = emailTemplate
      .replace("{{RE_DIRECT_URL}}", homeUrl)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

    await sendEmail(
      to,
      "Subscription confirmed - Manage your preferences",
      emailTemplate,
    );

    logInfo(`Subscription confirmation email sent to ${to}`);

    return res.status(200).json({
      success: true,
      message:
        "Unsubscribe request received. Please check your email to confirm.",
    });
  } catch (error) {
    logError("Error in unSubscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
