import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";
import AccessToken from "../../models/accessToken.js";

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

const createUnsubscribeUrl = async (email) => {
  try {
    const unsubscribeRequestToken = await AccessToken.issueToken({ email });
    return `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeRequestToken}`;
  } catch (error) {
    logError("Error generating unsubscribe URL", error);
    throw new Error("Failed to generate unsubscribe URL");
  }
};

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
    const tokenDoc = await AccessToken.fromJWT(token);

    if (!tokenDoc) {
      // Token invalid or revoked — try to decode to send new confirmation email
      const decoded = AccessToken.decodeJWT(token);
      const email = decoded?.email;
      const tokenId = decoded?._id || decoded?.id;

      if (email && tokenId) {
        // 1. Delete old token doc if it exists
        try {
          const oldTokenDoc = await AccessToken.findById(tokenId);
          if (oldTokenDoc) {
            logInfo(`Revoking expired token with ID: ${tokenId}`);
            await oldTokenDoc.revoke();
          }
        } catch (err) {
          logError("Error revoking old token", err);
        }

        // 2. Generate a new unsubscribe token
        const newUnsubscribeUrl = await createUnsubscribeUrl(email);

        // 3. Replace the placeholder in the confirmation email template
        const updatedConfirmationEmail =
          unsubscribeConfirmationTemplate.replace(
            "{{CONFIRM_UNSUBSCRIBE_URL}}",
            newUnsubscribeUrl,
          );

        // 4. Send the new confirmation email with the updated token
        await sendEmail(
          email,
          "Your unsubscribe request has expired",
          updatedConfirmationEmail,
        );

        logInfo(`Token expired. Sent new unsubscribe email to ${email}`);

        return res.status(401).json({
          success: false,
          message: "Token expired. A new confirmation email has been sent.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Invalid token structure.",
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
    await tokenDoc.revoke();

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
