import createUnsubscribeUrl from "./subscribeController.js";
import fs from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { logError, logInfo } from "../../util/logging.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import UnsubscribeToken from "../../models/subscribe/unsubscribeToken.js";

export const startUnsubscribeRequestController = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const subscribedUser = await SubscribedUser.findOne({
    email,
  });
  if (!subscribedUser) {
    logInfo(`Unsubscribe requested for non-subscribed email: ${email}`);
    return res.status(404).json({
      success: false,
      message: "User not found in the subscribed list.",
    });
  }

  // Delete any existing, unused tokens for this email
  await UnsubscribeToken.deleteMany({
    email,
    used: false,
  });

  // Create a new unsubscribe token
  const token = new UnsubscribeToken({
    email,
    used: false,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  //   const unsubscribeConfirmationTemplatePath = path.resolve(
  //     "src/templates/confirmUnsubscribeTemplate.html",
  //   );

  //   try {
  //     unsubscribeConfirmationTemplate = fs.readFileSync(
  //       unsubscribeConfirmationTemplatePath,
  //       "utf8",
  //     );
  //   } catch (error) {
  //     logError("Error in startUnsubscribeRequestController", error);
  //     return res.status(500).json({ success: false, message: "Server error." });
  //   }

  //   if (!unsubscribeConfirmationTemplate) {
  //     throw new Error("Email template not loaded properly");
  //   }

  //   const unsubscribeRequestUrl = await createUnsubscribeUrl(confirmedEmail);
  //   const homeUrl = `${baseDonnaVinoWebUrl}`;

  //   emailTemplate = emailTemplate
  //     .replace("{{RE_DIRECT_URL}}", homeUrl)
  //     .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);
  // };
};
