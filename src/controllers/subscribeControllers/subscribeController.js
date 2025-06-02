import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import PreSubscribedUser from "../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";
import AccessToken from "../../models/accessToken.js";
import EmailVerificationToken from "../../models/emailVerificationToken.js";

dotenv.config();

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

const createUnsubscribeUrl = async (email) => {
  try {
    const unsubscribeToken = await EmailVerificationToken.issueToken({ email });
    return `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeToken}`;
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
      return res.status(404).json({
        success: false,
        message: "Internal server error: Failed to read template",
      });
    }

    // Replace template variables with the provided data
    if (
      templateData &&
      typeof templateData === "object" &&
      !Array.isArray(templateData)
    ) {
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        emailTemplate = emailTemplate.replace(regex, templateData[key]);
      });
    }

    // Logic for validatíng that the token is present in the database (i.e has not been revoked or expired)
    const tokenDoc = await AccessToken.fromJWT(token);
    if (!tokenDoc) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }

    const { email: to } = tokenDoc;

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

    // Save new user to SubscribedUser collection and remove from PreSubscribedUser
    await new SubscribedUser({ email: to }).save();
    await PreSubscribedUser.deleteOne({ email: to });

    logInfo(
      `User ${to} moved to SubscribedUser and removed from PreSubscribedUser.`,
    );

    // Deleting the token
    logInfo(`Deleting token: ${tokenDoc._id}`);
    await tokenDoc.revoke();

    // Generate unsubscribe URL
    const unsubscribeRequestUrl = await createUnsubscribeUrl(to);
    const homeUrl = `${baseDonnaVinoWebUrl}`;

    emailTemplate = emailTemplate
      .replace("{{RE_DIRECT_URL}}", homeUrl)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

    await sendEmail(to, subject, emailTemplate);
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
