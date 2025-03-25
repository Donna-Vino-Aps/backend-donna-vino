import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/users/userModels.js";
import User from "../../models/users/userModels.js";
import PendingUser from "../../models/users/pendingUserModel.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import { sendVerificationEmail } from "../../services/email/verificationEmailService.js";

export const preSignUp = async (req, res) => {
  const pendingUserAllowedFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
    "isVip",
    "isSubscribed",
    "authProvider",
  ];

  if (!req.body.user || typeof req.body.user !== "object") {
    logError(
      `Invalid request: You need to provide a valid 'user' object. Received: ${JSON.stringify(
        req.body.user,
      )}`,
    );
    return res.status(400).json({
      success: false,
      msg: "Invalid request",
    });
  }

  // Normalize email if provided
  if (req.body.user.email && typeof req.body.user.email === "string") {
    req.body.user.email = req.body.user.email.toLowerCase();
  }

  // Validate the allowed fields
  const invalidFieldsError = validateAllowedFields(
    req.body.user,
    pendingUserAllowedFields,
  );
  if (invalidFieldsError) {
    logError(`Invalid fields present in the request: ${invalidFieldsError}`);
    return res.status(400).json({
      success: false,
      msg: "Invalid request",
    });
  }

  // Validate the user data
  const userToValidate = { ...req.body.user };
  const errorList = validateUser(userToValidate);
  if (errorList.length > 0) {
    logError(`Validation errors: ${JSON.stringify(errorList)}`);
    return res.status(400).json({
      success: false,
      msg: validationErrorMessage(errorList),
    });
  }

  const {
    email,
    isSubscribed = false,
    isVip = false,
    authProvider = "local",
  } = req.body.user;

  // Check if a permanent user already exists with this email
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
    if (existingUser) {
      logInfo(`User with email ${email} already exists`);
      return res.status(409).json({
        success: false,
        msg: "A user with this email already exists. Please try logging in instead.",
      });
    }
  } catch (dbError) {
    logError("Database error checking for existing user: " + dbError.message);
    return res.status(500).json({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  }

  // Check if a pending user already exists with this email
  let pendingUser;
  try {
    pendingUser = await PendingUser.findOne({ email });
  } catch (dbError) {
    logError("Database error checking for pending user: " + dbError.message);
    return res.status(500).json({
      success: false,
      msg: "Unable to process your signup. Please try again later.",
    });
  }

  // Create or update pending user
  try {
    if (pendingUser) {
      pendingUser.firstName = req.body.user.firstName;
      pendingUser.lastName = req.body.user.lastName;
      pendingUser.password = req.body.user.password;
      pendingUser.dateOfBirth = new Date(req.body.user.dateOfBirth);
      pendingUser.isSubscribed = isSubscribed;
      pendingUser.isVip = isVip;
      pendingUser.authProvider = authProvider;

      await pendingUser.save();
      logInfo(`Updated existing pending user: ${pendingUser.email}`);
    } else {
      pendingUser = await PendingUser.create({
        ...req.body.user,
        dateOfBirth: new Date(req.body.user.dateOfBirth),
      });
      logInfo(`Created new pending user: ${pendingUser.email}`);
    }
  } catch (dbError) {
    logError(
      "Database error creating/updating pending user: " + dbError.message,
    );
    return res.status(500).json({
      success: false,
      msg: "Unable to create your account. Please try again later.",
    });
  }

  // Generate new verification token and send email using the service
  try {
    await sendVerificationEmail(pendingUser);
  } catch (emailError) {
    logError("Error sending verification email: " + emailError.message);
  }

  return res.status(201).json({
    success: true,
    msg: "Verification email sent. Please check your inbox to complete the signup process.",
    pendingUser: {
      email: pendingUser.email,
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
    },
  });
};
