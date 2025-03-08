import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import PreSubscribedUser from "../../models/subscribe/preSubscribe.js";
import SubscribedUser from "../../models/subscribe/subscribedUser.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import path from "path";
import fs from "fs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

export const subscribeController = async (req, res) => {
  try {
    const { token, subject, templateName, templateData } = req.body;

    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      return res.status(400).json({ message: "Invalid template name." });
    }

    if (!token || !subject || !templateName) {
      return res.status(400).json({
        success: false,
        message: "Token, subject, and templateName are required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const { email } = decoded;

    const preSubscribedUser = await PreSubscribedUser.findOne({ email });

    if (!preSubscribedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in PreSubscribedUser",
      });
    }

    const existingSubscribedUser = await SubscribedUser.findOne({ email });
    if (existingSubscribedUser) {
      return res.status(200).json({
        success: true,
        message: "User is already subscribed",
      });
    }

    const newSubscribedUser = new SubscribedUser({ email });
    await newSubscribedUser.save();

    await PreSubscribedUser.deleteOne({ email });

    logInfo(
      `User ${email} moved to SubscribedUser and removed from PreSubscribedUser.`,
    );

    const templatePath = resolvePath(`src/templates/${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      logError(`Email template not found at: ${templatePath}`);
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    let emailTemplate = fs.readFileSync(templatePath, "utf-8");

    if (templateData && typeof templateData === "object") {
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        emailTemplate = emailTemplate.replace(regex, templateData[key]);
      });
    }

    await sendEmail(email, subject, emailTemplate);

    logInfo(`Welcome email sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: "Subscription confirmed and welcome email sent",
    });
  } catch (error) {
    logError("Error in subscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
