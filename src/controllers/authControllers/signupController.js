import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/users/userModels.js";
import User from "../../models/users/userModels.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import path from "path";
import fs from "fs";
import { sendEmail } from "../../util/emailUtils.js";
import SubscribedUser from "../../models/subscribe/subscribed.js";

export const signup = async (req, res) => {
  // Allowed fields in the user model
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
    "authProvider",
    "isSubscribed",
  ];

  if (!req.body.user || typeof req.body.user !== "object") {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: You need to provide a valid 'user' object. Received: ${JSON.stringify(
        req.body.user,
      )}`,
    });
  }

  // Normalize email if provided
  if (req.body.user.email && typeof req.body.user.email === "string") {
    req.body.user.email = req.body.user.email.toLowerCase();
  }

  // Validate `isSubscribed` field
  if (
    req.body.user.hasOwnProperty("isSubscribed") &&
    typeof req.body.user.isSubscribed !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request: 'isSubscribed' must be true or false.",
    });
  }

  // Validate the allowed fields
  const invalidFieldsError = validateAllowedFields(
    req.body.user,
    allowedFields,
  );
  if (invalidFieldsError) {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: ${invalidFieldsError}`,
    });
  }

  // Validate the user data
  const errorList = validateUser(req.body.user);
  if (errorList.length > 0) {
    return res.status(400).json({
      success: false,
      msg: validationErrorMessage(errorList),
    });
  }

  try {
    const { email, isSubscribed = false } = req.body.user;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If the user exists, only update `isSubscribed` field if needed
      if (!existingUser.isSubscribed && isSubscribed) {
        existingUser.isSubscribed = true;
        await existingUser.save();
        logInfo(`Updated isSubscribed to true for existing user: ${email}`);
      }
      return res.status(200).json({
        success: true,
        msg: "User already exists.",
        user: {
          id: existingUser._id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          authProvider: existingUser.authProvider,
          isVip: existingUser.isVip,
          isSubscribed: existingUser.isSubscribed,
        },
      });
    }

    // If the user does not exist, create a new one
    const newUser = await User.create(req.body.user);
    logInfo(`User created successfully: ${newUser.email}`);

    // If the user previously subscribed to the newsletter, remove that record.
    const subscribedRecord = await SubscribedUser.findOne({
      email: newUser.email,
    });
    if (subscribedRecord) {
      await SubscribedUser.deleteOne({ _id: subscribedRecord._id });
      logInfo(`Removed existing SubscribedUser record for ${newUser.email}`);
    }

    try {
      const templatePath = path.resolve(
        process.cwd(),
        "src/templates/verifyEmailTemplate.html",
      );
      const templateContent = fs.readFileSync(templatePath, "utf-8");
      const welcomeSubject = "Welcome to Donna Vino! Please Verify Your Email";
      await sendEmail(newUser.email, welcomeSubject, templateContent);
      logInfo(`Verify email sent to ${newUser.email}`);
    } catch (emailError) {
      logError("Error sending verify email: " + emailError.message);
    }

    return res.status(201).json({
      success: true,
      msg: "User created successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        authProvider: newUser.authProvider,
        isVip: newUser.isVip,
        isSubscribed: newUser.isSubscribed,
      },
    });
  } catch (error) {
    logError("Error in signup process: " + error.message);
    return res.status(500).json({
      success: false,
      msg: "Unable to create user, please try again later.",
    });
  }
};
