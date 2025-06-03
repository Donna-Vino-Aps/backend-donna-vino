import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import { generateToken } from "../token/tokenGenerator.js";
import { baseApiUrl } from "../../config/environment.js";
import { logError, logInfo } from "../../util/logging.js";

export const sendVerificationEmail = async (user) => {
  try {
    const token = await generateToken(user.email);

    const verifyUrl = `${baseApiUrl}/api/auth/sign-up?token=${token}`;

    const templateName = user.isSubscribed
      ? "verifyEmailForSignupWithNewsletterTemplate.html"
      : "verifyEmailForSignupTemplate.html";

    const templatePath = path.resolve(
      process.cwd(),
      `src/templates/${templateName}`,
    );

    let templateContent = fs.readFileSync(templatePath, "utf-8");
    templateContent = templateContent.replace("{{VERIFY_URL}}", verifyUrl);

    const verifySubject = "Verify your email address for Donna Vino";
    await sendEmail(user.email, verifySubject, templateContent);
    logInfo(`Verification email sent to ${user.email}`);
  } catch (error) {
    logError(`Error sending verification email: ${error.message}`);
    throw error; // Re-throw to allow caller to handle the error
  }
};
