import { PasswordChangeToken, User } from "../../models/index.js";
import sendEmail from "../../util/sendEmail.js";
import { baseDonnaVinoEcommerceWebUrl } from "../../config/environment.js";

/**
 * @description
 * Handles local forgot password via email.
 * This route is intended to use by users who have forgotten their password.
 *
 * Workflow:
 * - Checks if the user exists for the provided email.
 * - If the user does not exist, returns an error.
 * - If the user exists, generates a password reset token and sends a reset password link via email to the user.
 *
 * @route POST /api/register/reset-password
 * @access Public
 */

export async function resendPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(401).json({
        message: "Email address can not be empty.",
      });
    }

    const existingPasswordResetToken = await PasswordChangeToken.findOne({
      email,
    });
    if (existingPasswordResetToken) {
      await existingPasswordResetToken.revoke();
    }

    await sendPasswordReset(req, res);
  } catch (error) {
    return res.status(500).json({
      message: `Error resending password reset: ${error.message}`,
    });
  }
}

export async function sendPasswordReset(req, res) {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user) {
      const resetPasswordToken = await user.issueResetPasswordToken();
      await sendEmail(email, "Reset Your Password", "resetPassword", {
        name: user.firstName,
        token: resetPasswordToken,
        baseUrl: baseDonnaVinoEcommerceWebUrl,
      });
    }
    return res.status(200).json({
      success: user ? true : false,
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "An internal server error occurred. Please try again later.",
    });
  }
}
