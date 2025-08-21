import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";
import EmailVerificationToken from "../../models/emailVerificationToken.js";
import { generateUnsubscribeSignature } from "../../util/hmac.js";
// import crypto from "crypto";

dotenv.config();

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

/**
 * Controller to handle both:
 * 1. Initial subscription requests (sends a verification email)
 * 2. Confirming subscription (via a token from the verification email)
 */
export const subscribeController = async (req, res) => {
  try {
    const { email, token, subject, templateName, templateData } = req.body;

    // Validate required fields
    if (!subject || !templateName) {
      return res.status(400).json({
        success: false,
        message: "Subject and templateName are required.",
      });
    }

    // Validate Template Filename
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      return res.status(400).json({ message: "Invalid template name." });
    }

    // Load the email template
    const templatePath = resolvePath(`src/templates/${templateName}.html`);

    // Check if the template file exists
    if (!fs.existsSync(templatePath)) {
      logError(`Email template not found at: ${templatePath}`);
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    // Read the email template content
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

    // Replace template placeholders with the provided data from templateData
    if (templateData && typeof templateData === "object") {
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        emailTemplate = emailTemplate.replace(regex, templateData[key]);
      });
    }

    // FLOW 1: Subscription confirmation using token
    if (token) {
      // Verify EmailVerificationToken
      const tokenDoc = await EmailVerificationToken.findOne({ token });
      if (!tokenDoc || tokenDoc.used || tokenDoc.expiresAt < new Date()) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid or expired token." });
      }

      // Get the email from the token
      const confirmedEmail = tokenDoc.email;

      // Check if the email is already subscribed
      const existingSubscribedUser = await SubscribedUser.findOne({
        email: confirmedEmail,
      });
      if (existingSubscribedUser) {
        return res
          .status(200)
          .json({ success: true, message: "User is already subscribed." });
      }

      // Create a new subscribed user in DB
      const newSubscribedUser = await new SubscribedUser({
        email: confirmedEmail,
      }).save();

      // Mark token as used after successful subscription
      tokenDoc.used = true;
      await tokenDoc.save();

      // Generate unsubscribe URL with correct parameters
      const uid = newSubscribedUser._id.toString();
      const sig = generateUnsubscribeSignature(uid);
      const unsubscribeRequestUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?uid=${uid}&sig=${sig}`;
      const homeUrl = `${baseDonnaVinoWebUrl}`;

      // Replace placeholders for unsubscribe and redirect in the email template
      emailTemplate = emailTemplate
        .replace("{{RE_DIRECT_URL}}", homeUrl)
        .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

      // Send the welcome e-mail
      await sendEmail(confirmedEmail, subject, emailTemplate);
      logInfo(
        `User ${confirmedEmail} confirmed subscription and received welcome email.`,
      );

      return res.status(200).json({
        success: true,
        message: "Subscription confirmed. Email sent.",
      });
    }

    // FLOW 2: Initial subscription request (no token)
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required when no token is provided.",
      });
    }

    // Check if already subscribed
    const alreadySubscribed = await SubscribedUser.findOne({ email });
    if (alreadySubscribed) {
      return res
        .status(200)
        .json({ success: true, message: "You are already subscribed." });
    }

    // Clean up old unused tokens before creating a new one
    await EmailVerificationToken.deleteMany({
      email,
      used: false,
      expiresAt: null,
    });

    // Create token for e-mail verification
    const verificationToken = new EmailVerificationToken({ email });
    await verificationToken.save();

    // Createa verification link
    const verifyUrl = `${baseDonnaVinoWebUrl}/subscription/confirm?token=${verificationToken.token}`;

    // Replace placeholder with verification link in the email template
    emailTemplate = emailTemplate.replace("{{RE_DIRECT_URL}}", verifyUrl);

    // Send verification email
    await sendEmail(email, subject, emailTemplate);
    logInfo(`Verification email sent to ${email} with confirmation link.`);

    return res.status(200).json({
      success: true,
      message:
        "Verification email sent. Please check your inbox to confirm subscription.",
    });
  } catch (error) {
    logError("Error in subscribeController", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
