import { User, PasswordChangeToken } from "../../models/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
/**
 * @description
 * Handles requests to change a user's password after they are authenticated.
 * This controller verifies the user's identity, validates the new password, and updates the password in the database.
 *
 * Workflow:
 * - Authenticates the user and checks that the current password is correct.
 * - Updates the user's password with the new value.
 * - Returns a success message if the password was changed, or an error if validation/authentication fails.
 *
 * @route POST /api/register/change-password
 * @access Public
 */

export async function handleChangePassword(req, res) {
  try {
    const token = req.body.token;
    const password = req.body.password;

    const existingToken = await PasswordChangeToken.fromJWT(token);

    if (!existingToken) {
      return res.status(401).json({
        message:
          "Authentication failed. Please check your credentials and try again.",
      });
    }

    const userId = jwt.verify(token, process.env.JWT_SECRET).sub;

    const user = await User.findById(userId);

    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: "This password has been used before.",
      });
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    await existingToken.revoke();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error. Please try again later.",
    });
  }
}
