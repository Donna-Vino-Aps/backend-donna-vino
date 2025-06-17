import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";
import {
  generateUnsubscribeSignature,
  isValidUnsubscribeSignature,
} from "../../util/hmac.js";

dotenv.config();

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);
const unsubscribeSuccessTemplatePath = resolvePath(
  "src/templates/unsubscribeSuccessTemplate.html",
);

let emailSuccessTemplate;
try {
  emailSuccessTemplate = fs.readFileSync(
    unsubscribeSuccessTemplatePath,
    "utf8",
  );
} catch (error) {
  logError("Error reading email templates", error);
}
if (!emailSuccessTemplate) {
  throw new Error("Email templates not loaded properly");
}

export const unSubscribeController = {
  showUnsubscribePage: async (req, res) => {
    try {
      const { uid, sig } = req.query;
      if (!uid || !sig) {
        return res.status(400).json({
          success: false,
          message: "Missing parameters.",
        });
      }

      // Verify signature using uid with function from hmac.js
      if (generateUnsubscribeSignature(uid) !== sig) {
        return res.status(403).json({
          success: false,
          message: "Invalid unsubscribe link.",
        });
      }

      // Verify if the user exists in the subscribed list
      const existingSubscribedUser = await SubscribedUser.findById(uid);
      if (!existingSubscribedUser) {
        logInfo(`User with uid ${uid} not found in the subscribed list.`);
        return res.status(404).json({
          success: false,
          message: "User does not exist in the subscribed list.",
        });
      }

      const redirectUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?uid=${uid}&sig=${sig}`;
      logInfo(`Redirecting user ${uid} to unsubscribe page at ${redirectUrl}`);
      res.redirect(redirectUrl);
      logInfo(`Unsubscribe page displayed for user ${uid}.`);
    } catch (error) {
      logError("Error in showUnsubscribePage", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while processing your request.",
      });
    }
  },
  handleUnsubscribeRequest: async (req, res) => {
    const { uid, sig } = req.body;
    if (!uid || !sig) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters.",
      });
    }

    if (!isValidUnsubscribeSignature(uid, sig)) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired signature.",
      });
    }

    // Remove the user from the subscription list
    try {
      const deleted = await SubscribedUser.findByIdAndDelete(uid);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "User already unsubscribed or not found",
        });
      }
      logInfo(`User ${uid} unsubscribed successfully.`);

      // Send the success email
      await sendEmail(
        deleted.email,
        "Subscription successfully canceled",
        emailSuccessTemplate,
      );
      logInfo(`Unsubscribe success email sent to ${deleted.email}`);

      // Redirect user to success-page
      const redirectUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribed`;
      logInfo(
        `Redirecting user ${deleted.email} to unsubscribe page at ${redirectUrl}`,
      );
      res.redirect(redirectUrl);
    } catch (error) {
      logError("Error in unSubscribeController", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
