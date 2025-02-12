import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

import transporter from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import User from "../../models/userModels.js";
import { logError, logInfo } from "../../util/logging.js";

const __dirname = path.resolve();
export const resolvePath = (relativePath) => {
  const basePath = process.env.GITHUB_ACTIONS
    ? path.join(process.cwd(), "src")
    : __dirname;
  return path.resolve(basePath, relativePath);
};

const development = "http://localhost:3000";
const production = "https://backend-donna-vino-c5c2e1c03c18.herokuapp.com";
const currentUrl =
  process.env.NODE_ENV === "production" ? production : development;

export const sendVerificationEmail = async (user) => {
  const { _id, email } = user;
  const uniqueString = uuidv4() + _id;

  const templatePath = resolvePath("../../templates/verifyEmailTemplate.html");
  let emailTemplate;

  try {
    emailTemplate = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    logError(`Error reading email template: ${error.message}`);
    throw new Error("Error reading email template");
  }

  const verifyUrl = `${currentUrl}/api/auth/verify/${_id}/${uniqueString}`;
  emailTemplate = emailTemplate.replace("{{VERIFY_URL}}", verifyUrl);

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify your Email",
    html: emailTemplate,
  };

  try {
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 hours
    });

    await newVerification.save();
    await transporter.sendMail(mailOptions);
    logInfo("Verification email sent successfully");
    return { success: true, message: "Verification email sent" };
  } catch (error) {
    logError(`Failed to send verification email: ${error.message}`);
    throw new Error("Verification email process failed");
  }
};

export const resendVerificationLink = async (req, res) => {
  logInfo("Request Body:", req.body);
  try {
    const { email, userId } = req.body;

    if (!userId || !email) {
      const errorMsg = "Empty user details are not allowed";
      logError(errorMsg);
      return res.status(400).json({
        success: false,
        error: errorMsg,
      });
    }

    await UserVerification.deleteMany({ userId });
    const emailSent = await sendVerificationEmail({ _id: userId, email });

    if (!emailSent) {
      const errorMsg = "Failed to send verification email.";
      logError(errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }

    logInfo("Verification link resent successfully.");
    return res.status(200).json({
      success: true,
      msg: "Verification link resent successfully.",
    });
  } catch (error) {
    logError(error);
    return res.status(500).json({
      success: false,
      error: `Verification Link Resend Error: ${error.message}`,
    });
  }
};

export const verifyEmail = async (req, res) => {
  logInfo("verifyEmail function called");
  const { userId, uniqueString } = req.params;
  logInfo(`Params - userId: ${userId}, uniqueString: ${uniqueString}`);

  try {
    const result = await UserVerification.findOne({ userId });

    if (result) {
      logInfo("UserVerification record found:", result);
      const { expiresAt, uniqueString: hashedUniqueString } = result;

      if (expiresAt < Date.now()) {
        logInfo("Verification link has expired");
        await UserVerification.deleteOne({ userId });
        await User.deleteOne({ _id: userId });
        const message = "Link has expired. Please sign up again";
        logInfo(message);
        return res.redirect(`/user/verified?error=true&message=${message}`);
      }

      logInfo("Verification link is still valid");
      const match = await bcrypt.compare(uniqueString, hashedUniqueString);

      if (match) {
        logInfo("Unique strings match");
        await User.updateOne({ _id: userId }, { verified: true });
        logInfo("User verification status updated successfully");
        return res.sendFile(resolvePath("views/verified.html"));
      } else {
        const message =
          "Invalid verification details passed. Check your inbox.";
        logInfo(message);
        return res.redirect(`/user/verified?error=true&message=${message}`);
      }
    } else {
      const message =
        "Account record doesn't exist or has been verified already. Please sign up or log in.";
      logInfo(message);
      return res.redirect(`/user/verified?error=true&message=${message}`);
    }
  } catch (error) {
    logError(error);
    const message =
      "An error occurred while checking for existing user verification record";
    logInfo(message, error);
    return res.redirect(`/user/verified?error=true&message=${message}`);
  }
};
