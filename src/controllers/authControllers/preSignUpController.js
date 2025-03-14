import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/users/userModels.js";
import User from "../../models/users/userModels.js";
import PendingUser from "../../models/users/pendingUserModel.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import path from "path";
import fs from "fs";
import { sendEmail } from "../../util/emailUtils.js";
import { generateToken } from "../../services/token/tokenGenerator.js";

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
      logInfo(`User with email ${email} already exists, returning user info`);
      return res.status(200).json({
        success: true,
        msg: "User already exists.",
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

  // Send verification email
  try {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/sign-up?token=${token}`;

    const templateName = isSubscribed
      ? "verifyEmailForSignupWithNewsletterTemplate.html"
      : "verifyEmailForSignupTemplate.html";

    const templatePath = path.resolve(
      process.cwd(),
      `src/templates/${templateName}`,
    );

    let templateContent = fs.readFileSync(templatePath, "utf-8");
    templateContent = templateContent.replace("{{VERIFY_URL}}", verifyUrl);

    const verifySubject = "Verify your email address for Donna Vino";
    await sendEmail(pendingUser.email, verifySubject, templateContent);
    logInfo(`Verification email sent to ${pendingUser.email}`);
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
