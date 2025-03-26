import { logError, logInfo } from "../../util/logging.js";
import User from "../../models/users/userModels.js";
import PendingUser from "../../models/users/pendingUserModel.js";
import path from "path";
import fs from "fs";
import { sendEmail } from "../../util/emailUtils.js";
import jwt from "jsonwebtoken";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
} from "../../services/token/tokenRepository.js";
import { baseDonnaVinoEcommerceWebUrl } from "../../config/environment.js";

export const signUp = async (req, res) => {
  const { token } = req.query;

  // 1.Check if token exists
  if (!token) {
    logError("Missing token in verification request");
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=missing`,
    );
  }

  // 2. Verify JWT token format and signature
  let decoded;
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logError(`Token expired: ${token}`);
      return res.redirect(
        `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=expired`,
      );
    } else if (error.name === "JsonWebTokenError") {
      logError(`Invalid token: ${token}, error: ${error.message}`);
      return res.redirect(
        `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=invalid`,
      );
    } else {
      logError(`Error verifying token: ${error.message}`);
      return res.redirect(
        `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
      );
    }
  }

  // 3. Check if token has been used
  try {
    if (await isTokenUsed(decoded.id)) {
      logError(`Token ${decoded.id} has already been used`);
      return res.redirect(
        `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=invalid`,
      );
    }
  } catch (error) {
    logError(`Error checking if token is used: ${error.message}`);
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
    );
  }

  // 4. Mark token as used immediately
  try {
    await markTokenAsUsed(decoded.id);
  } catch (error) {
    logError(`Error marking token as used: ${error.message}`);
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
    );
  }

  // 5. Find the pending user by email
  let pendingUser;
  try {
    pendingUser = await PendingUser.findOne({ email: decoded.email });

    if (!pendingUser) {
      logError(`No pending user found for email: ${decoded.email}`);
      return res.redirect(
        `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=not_found`,
      );
    }
  } catch (dbError) {
    logError(`Database error finding pending user: ${dbError.message}`);
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
    );
  }

  // 6. Check if user already exists
  try {
    const existingUser = await User.findOne({ email: decoded.email });

    if (existingUser) {
      logInfo(`User ${decoded.email} already exists, cleaning up pending user`);

      try {
        await PendingUser.deleteOne({ _id: pendingUser._id });
        logInfo(
          `Deleted pending user for already existing user: ${pendingUser.email}`,
        );
      } catch (deleteError) {
        logError(`Error deleting pending user: ${deleteError.message}`);
      }

      return res.redirect(`${baseDonnaVinoEcommerceWebUrl}/login`);
    }
  } catch (dbError) {
    logError(`Database error checking existing user: ${dbError.message}`);
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
    );
  }

  // 7. Create the permanent user
  let newUser;
  try {
    const pendingUserData = pendingUser.toObject();
    delete pendingUserData._id;
    delete pendingUserData.__v;

    // Set a flag to tell the user model to skip password hashing since
    // the password is already hashed by the pendingUser model
    pendingUserData._skipPasswordHashing = true;

    newUser = await User.create(pendingUserData);

    logInfo(`User created successfully from pending user: ${newUser.email}`);
  } catch (dbError) {
    logError(`Error creating user: ${dbError.message}`);
    return res.redirect(
      `${baseDonnaVinoEcommerceWebUrl}/signup/verification-failed?type=error`,
    );
  }

  // 8. Send welcome email
  try {
    const templatePath = path.resolve(
      process.cwd(),
      "src/templates/emailWelcomeTemplate.html",
    );
    let templateContent = fs.readFileSync(templatePath, "utf-8");
    templateContent = templateContent.replace(
      "{{RE_DIRECT_URL}}",
      `${baseDonnaVinoEcommerceWebUrl}`,
    );
    const welcomeSubject = "Welcome to Donna Vino!";

    await sendEmail(newUser.email, welcomeSubject, templateContent);
    logInfo(`Welcome email sent to ${newUser.email}`);
  } catch (error) {
    logError(`Error sending welcome email: ${error.message}`);
  }

  // 9. Delete the pending user record
  try {
    await PendingUser.deleteOne({ _id: pendingUser._id });
    logInfo(`Deleted pending user record for ${pendingUser.email}`);
  } catch (dbError) {
    logError(`Error deleting pending user: ${dbError.message}`);
  }

  // 10. Clean up by deleting the token
  try {
    await deleteToken(decoded.id);
    logInfo(`Deleted token ${decoded.id}`);
  } catch (dbError) {
    logError(`Error deleting token: ${dbError.message}`);
  }

  // 11. Success
  return res.redirect(`${baseDonnaVinoEcommerceWebUrl}/login`);
};
