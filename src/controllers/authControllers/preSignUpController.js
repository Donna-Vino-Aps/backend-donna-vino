import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/users/userModels.js";
import User from "../../models/users/userModels.js";
import PendingUser from "../../models/users/pendingUserModel.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import { generateToken } from "../../services/token/tokenGenerator.js";

export const preSignUp = async (req, res) => {
  const pendingUserAllowedFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
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

  // Validate the allowed fields
  const invalidFieldsError = validateAllowedFields(
    req.body.user,
    pendingUserAllowedFields,
  );
  if (invalidFieldsError) {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: ${invalidFieldsError}`,
    });
  }

  // Validate the user data
  const userToValidate = { ...req.body.user };
  const errorList = validateUser(userToValidate);
  if (errorList.length > 0) {
    return res.status(400).json({
      success: false,
      msg: validationErrorMessage(errorList),
    });
  }

  const { email, isSubscribed = false } = req.body.user;

  // Check if a permanent user already exists with this email
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({
        success: true,
        msg: "User already exists.",
        user: {
          id: existingUser._id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
        },
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

  // Generate verification token
  let token;
  try {
    token = await generateToken(email);
  } catch (tokenError) {
    logError("Error generating token: " + tokenError.message);
    return res.status(500).json({
      success: false,
      msg: "Unable to create verification token. Please try again later.",
    });
  }

  // Create or update pending user
  try {
    if (pendingUser) {
      pendingUser.verificationToken = token;
      pendingUser.firstName = req.body.user.firstName;
      pendingUser.lastName = req.body.user.lastName;
      pendingUser.password = req.body.user.password;
      pendingUser.dateOfBirth = new Date(req.body.user.dateOfBirth);
      pendingUser.isSubscribed = isSubscribed;

      await pendingUser.save();
      logInfo(`Updated existing pending user: ${pendingUser.email}`);
    } else {
      pendingUser = await PendingUser.create({
        ...req.body.user,
        dateOfBirth: new Date(req.body.user.dateOfBirth),
        verificationToken: token,
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
