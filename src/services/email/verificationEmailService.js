import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import { baseDonnaVinoWebUrl } from "../../config/environment.js";
import { logError, logInfo } from "../../util/logging.js";
import EmailVerificationToken from "../../models/emailVerificationToken.js";

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

export const sendVerificationEmail = async (user) => {
  try {
    // Issue a token document in MongoDB (with metadata) for the user in the tokens collection
    const tokenDoc = await EmailVerificationToken.issueToken({
      userId: user._id,
      email: user.email,
    });

    const verifyUrl = `${baseDonnaVinoWebUrl}/api/auth/sign-up?token=${tokenDoc.token}`;

    // Choose correct template based on subscription status
    const templateName = user.isSubscribed
      ? "verifyEmailForSignupWithNewsletterTemplate.html"
      : "verifyEmailForSignupTemplate.html";

    const templatePath = resolvePath(`src/templates/${templateName}.html`);

    // Ensure the template file exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templatePath}`);
    }

    let templateContent = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders in the template with actual values
    templateContent = templateContent.replace("{{VERIFY_URL}}", verifyUrl);

    // Send the email
    const verifySubject = "Verify your email address for Donna Vino";
    await sendEmail(user.email, verifySubject, templateContent);
    logInfo(`Verification email sent to ${user.email}`);
  } catch (error) {
    logError(`Error sending verification email: ${error.message}`);
    throw error; // Re-throw to allow caller to handle the error
  }
};
