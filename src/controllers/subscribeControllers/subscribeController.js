import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import PreSubscribedUser from "../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail, addContactToResend } from "../../util/emailUtils.js";
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

const createUnsubscribeUrl = async (email) => {
  try {
    const unsubscribeRequestToken = await generateToken(email);
    return `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeRequestToken}`;
  } catch (error) {
    logError("Error generating unsubscribe URL", error);
    throw new Error("Failed to generate unsubscribe URL");
  }
};

export const subscribeController = async (req, res) => {
  try {
    const { token, subject, templateName, templateData } = req.body;

    if (!token || !subject || !templateName) {
      return res.status(400).json({
        success: false,
        message: "Token, subject, and templateName are required.",
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      return res.status(400).json({ message: "Invalid template name." });
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

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const { email: to, id: tokenId } = decoded;

    const tokenUsed = await isTokenUsed(tokenId);
    if (tokenUsed) {
      return res.status(400).json({
        success: false,
        message: "This token has already been used.",
      });
    }

    const preSubscribedUser = await PreSubscribedUser.findOne({ email: to });
    if (!preSubscribedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in PreSubscribedUser",
      });
    }

    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (existingSubscribedUser) {
      return res.status(200).json({
        success: true,
        message: "User is already subscribed.",
      });
    }

    const newSubscribedUser = new SubscribedUser({ email: to });
    await newSubscribedUser.save();

    await PreSubscribedUser.deleteOne({ email: to });

    logInfo(
      `User ${to} moved to SubscribedUser and removed from PreSubscribedUser.`,
    );

    logInfo(`Marking token as used: ${tokenId}`);
    await markTokenAsUsed(tokenId);

    logInfo(`Deleting token: ${tokenId}`);
    await deleteToken(tokenId);

    const unsubscribeRequestUrl = await createUnsubscribeUrl(to);
    const homeUrl = `${baseDonnaVinoWebUrl}`;

    emailTemplate = emailTemplate
      .replace("{{RE_DIRECT_URL}}", homeUrl)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

    await sendEmail(to, subject, emailTemplate);
    await addContactToResend(to);

    logInfo(`Welcome email with unsubscribe option sent to ${to}`);

    return res.status(200).json({
      success: true,
      message:
        "Subscription confirmed. An email has been sent with unsubscribe options.",
    });
  } catch (error) {
    logError("Error in subscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
