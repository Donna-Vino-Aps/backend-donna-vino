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
import { baseDonnaVinoWebUrl } from "../../config/environment.js";

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
const createUnsubscribeUrl = async (email) => {
  const unsubscribeRequestToken = await generateToken(email); // Wait for the token to resolve
  return `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeRequestToken}`;
};

export const unSubscribeController = async (req, res) => {
  try {
    // Check if token is missing in the query
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required.",
      });
    }

    // Define template paths
    const unsubscribeSuccessTemplatePath = resolvePath(
      "src/templates/unsubscribeSuccessTemplate.html",
    );
    const unsubscribeConfirmationTemplatePath = resolvePath(
      "src/templates/unsubscribeConfirmation.html",
    );

    let emailTemplate;
    let unsubscribeConfirmationTemplate;

    // Try reading the templates
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

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);

      // If the token is expired, send the confirmation email
      const { email: to } = decoded || {};
      const unsubscribeRequestUrl = await createUnsubscribeUrl(to);

      // Replace the placeholder in the confirmation template
      const newExpiredEmail = unsubscribeConfirmationTemplate.replace(
        "{{UNSUBSCRIBE_URL}}",
        unsubscribeRequestUrl,
      );

      await sendEmail(to, "Confirm your unsubscribe request", newExpiredEmail);

      logInfo(
        `Unsubscribe email sent to ${to} with subject "Confirm your unsubscribe request"`,
      );

      return res.status(401).json({
        success: false,
        message:
          "Your unsubscribe link has expired. A new confirmation email has been sent.",
      });
    }

    // If the token is valid, proceed with unsubscribe logic
    const { email: to, id: tokenId } = decoded;

    // Check if the token has already been used
    const tokenUsed = await isTokenUsed(tokenId);
    if (tokenUsed) {
      return res.status(400).json({
        success: false,
        message: "This unsubscribe request has already been processed.",
      });
    }

    // Check if the user exists in the subscribed list
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (!existingSubscribedUser) {
      return res.status(404).json({
        success: false,
        message: "User does not exist in the subscribed list.",
      });
    }

    // Remove user from the subscribed list
    await SubscribedUser.deleteOne({ email: to });

    logInfo(`User ${to} unsubscribed successfully.`);

    // Mark the token as used and delete it
    await markTokenAsUsed(tokenId);
    await deleteToken(tokenId);

    // Create the unsubscribe URL
    const unsubscribeRequestUrl = await createUnsubscribeUrl(to);

    // Replace the unsubscribe URL in the success email template
    const newSuccessEmail = emailTemplate.replace(
      "{{UNSUBSCRIBE_URL}}",
      unsubscribeRequestUrl,
    );

    // Send the unsubscribe success email
    await sendEmail(to, "Subscription successfully canceled", newSuccessEmail);

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
