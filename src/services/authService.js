import PendingUser from "../models/pendingUserModel.js";
import User from "../models/userModels.js";
import { validatePendingUserData } from "../util/validatePendingUserData.js";
import { logInfo, logError } from "../util/logging.js";
import jwt from "jsonwebtoken";
import { sendEmailController } from "../controllers/sendEmailControllers/sendEmailController.js";

export const signUpUser = async (userData) => {
  try {
    validatePendingUserData(userData);

    const {
      firstName,
      lastName,
      email,
      password,
      birthdate,
      isSubscribed = false,
    } = userData;

    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await User.exists({ email: trimmedEmail });

    const existingPendingUser = await PendingUser.findOne({
      email: trimmedEmail,
    });

    logInfo("User email to check:", trimmedEmail);

    if (existingPendingUser) {
      throw new Error(
        "A verification email was already sent. Please check your inbox.",
      );
    }

    if (existingUser) {
      throw new Error("Email is already registered. Please log in instead.");
    }

    const birthdateObj = new Date(birthdate);
    if (isNaN(birthdateObj.getTime())) {
      throw new Error("Invalid birthdate.");
    }

    const age = new Date().getFullYear() - birthdateObj.getFullYear();
    if (age < 18) {
      throw new Error("User must be at least 18 years old.");
    }

    const verificationToken = jwt.sign(
      { email, firstName, lastName },
      process.env.JWT_SECRET,
      { expiresIn: "6h" },
    );

    const newPendingUser = new PendingUser({
      firstName,
      lastName,
      email: trimmedEmail,
      password,
      birthdate: birthdateObj,
      isSubscribed,
      verificationToken,
    });

    await newPendingUser.save();

    logInfo("Pending user created:", newPendingUser);

    const emailData = {
      to: trimmedEmail,
      subject: "Please Verify Your Email Address",
      templateName: "verifyEmailTemplate",
      templateData: {
        firstName,
        lastName,
        verificationLink: `${process.env.API_URL_LOCAL}/verify?token=${verificationToken}`,
      },
    };

    await sendEmailController({ body: emailData });

    return {
      message:
        "Pending user created successfully. Please check your email to verify your account.",
      user: newPendingUser,
    };
  } catch (error) {
    logError("Error in signUpUser:", error.message, error.stack);
    throw new Error(`SignUpUser failed: ${error.message}`);
  }
};
