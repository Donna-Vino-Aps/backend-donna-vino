import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";

dotenv.config();

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);
const unsubscribeSuccessTemplatePath = resolvePath(
  "src/templates/unsubscribeSuccessTemplate.html",
);
// const unsubscribeConfirmationTemplatePath = resolvePath(
//   "src/templates/confirmUnsubscribeTemplate.html",
// );
let emailSuccessTemplate;
// let unsubscribeConfirmationTemplate;
try {
  emailSuccessTemplate = fs.readFileSync(
    unsubscribeSuccessTemplatePath,
    "utf8",
  );
  // unsubscribeConfirmationTemplate = fs.readFileSync(
  //   unsubscribeConfirmationTemplatePath,
  //   "utf8",
  // );
} catch (error) {
  logError("Error reading email templates", error);
}
if (!emailSuccessTemplate) {
  throw new Error("Email templates not loaded properly");
}

export const unSubscribeController = {
  showUnsubscribePage: async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "E-mail is required.",
        });
      }

      // Verify if the user exists in the subscribed list
      const existingSubscribedUser = await SubscribedUser.findOne({
        email,
      });
      if (!existingSubscribedUser) {
        logInfo(`User with email ${email} not found in the subscribed list.`);
        return res.status(404).json({
          success: false,
          message: "User does not exist in the subscribed list.",
        });
      }

      const redirectUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?email=${encodeURIComponent(
        email,
      )}`;
      logInfo(
        `Redirecting user ${email} to unsubscribe page at ${redirectUrl}`,
      );
      res.redirect(redirectUrl);
      logInfo(`Unsubscribe page displayed for user ${email}.`);
    } catch (error) {
      logError("Error in showUnsubscribePage", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while processing your request.",
      });
    }
  },
  handleUnsubscribeRequest: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "E-mail is required.",
      });
    }

    // Remove the user from the subscription list
    try {
      const deleted = await SubscribedUser.findOneAndDelete({ email });
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Email not found or already unsubscribed.",
        });
      }
      logInfo(`User ${email} unsubscribed successfully.`);

      // Send the success email
      await sendEmail(
        email,
        "Subscription successfully canceled",
        emailSuccessTemplate,
      );
      logInfo(`Unsubscribe success email sent to ${email}`);

      // Redirect user to success-page
      const redirectUrl = `${baseDonnaVinoWebUrl}/subscription/unsubscribed`;
      logInfo(
        `Redirecting user ${email} to unsubscribe page at ${redirectUrl}`,
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
