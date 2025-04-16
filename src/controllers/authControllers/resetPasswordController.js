import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { sendEmail } from "../../util/emailUtils.js";
import User, { validateUser } from "../../models/users/userModels.js";
import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validatePassword } from "../../util/authUtils.js";
import { baseDonnaVinoEcommerceWebUrl } from "../../config/environment.js";

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

// Request Password Reset (Send Reset Email)
export const requestPasswordReset = async (req, res) => {
  if (!req.body || typeof req.body !== "object" || !req.body.email) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request format. Email is required.",
    });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const resetLink = `${baseDonnaVinoEcommerceWebUrl}/reset-password?token=${resetToken}`;

    const templatePath = resolvePath(
      "src/templates/resetPasswordTemplate.html",
    );
    let emailContent = fs.readFileSync(templatePath, "utf8");

    emailContent = emailContent.replace("{{RESET_PASSWORD_URL}}", resetLink);

    await sendEmail(user.email, "Password Reset Request", emailContent);

    return res.json({ success: true, msg: "Password reset email sent" });
  } catch (error) {
    logError("Error requesting password reset:", error);
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      success: false,
      msg: "Invalid request format",
    });
  }

  const { token, newPassword, confirmPassword, ...additionalFields } = req.body;

  try {
    const errors = [];
    if (!token) errors.push("Token is required");
    if (!newPassword) errors.push("New password is required");
    if (!confirmPassword) errors.push("Password confirmation is required");

    if (Object.keys(additionalFields).length > 0) {
      errors.push("Invalid fields present in the request");
    }

    if (errors.length > 0) {
      const errorMessage = validationErrorMessage(errors);
      return res.status(400).json({ success: false, error: errorMessage });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "The passwords you entered don't match. Please make sure both passwords are identical.",
      });
    }

    const { isValid, errors: passwordErrors } = validatePassword(newPassword);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: passwordErrors.join(" "),
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate token purpose
    if (decoded.purpose !== "password_reset") {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired token. Please request a new password reset link.",
      });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is logged in through local authentication
    if (user.authProvider !== "local") {
      return res.status(400).json({
        success: false,
        message:
          "Password reset not available for accounts using external authentication",
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Update password
    user.password = newPassword;

    const validationErrors = validateUser({ password: newPassword });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Password doesn't meet requirements",
        errors: validationErrors,
      });
    }

    // Save the updated user object
    await user.save();

    logInfo(`Password updated for user ${user.email}`);

    return res.json({
      success: true,
      message:
        "Your password has been successfully reset. Redirecting to login...",
    });
  } catch (error) {
    logError("Error resetting password:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Password reset link has expired. Please request a new one.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or malformed token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
};
