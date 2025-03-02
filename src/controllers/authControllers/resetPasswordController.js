import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../../models/users/userModels.js";
import { sendEmail } from "../../util/emailUtils.js";

const generateResetToken = () => crypto.randomBytes(32).toString("hex");

export const updateUserData = async (req, res) => {
  const { action, email, token, newPassword } = req.body;

  try {
    if (action === "request-reset") {
      if (!email) {
        return res
          .status(400)
          .json({ success: false, msg: "Email is required." });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          msg: "No user found with this email address.",
        });
      }

      const resetToken = generateResetToken();
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // this token is valid for 1 hour
      const resetTokenExpiry = Date.now() + 3600000;

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      await sendEmail(
        user.email,
        "Password Reset Request",
        `Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.`,
      );

      return res
        .status(200)
        .json({ success: true, msg: "Password reset email sent." });
    }

    if (action === "verify-token") {
      if (!token) {
        return res
          .status(400)
          .json({ success: false, msg: "Token is required." });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, msg: "Invalid or expired token." });
      }

      return res.status(200).json({ success: true, msg: "Token is valid." });
    }

    if (action === "reset-password") {
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          msg: "Token and new password are required.",
        });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, msg: "Invalid or expired token." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res
        .status(200)
        .json({ success: true, msg: "Password reset successful." });
    }

    return res.status(400).json({ success: false, msg: "Invalid action." });
  } catch (error) {
    console.error("Update user data error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred. Please try again later.",
    });
  }
};
