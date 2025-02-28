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
    const userDataCopy = { ...userData };

    const existingUser = await User.exists({ email: userData.email });

    logInfo("User email to check:", userData.email);
    // check if the email is already in the pendingUser-collection
    const trimmedEmail = userData.email.trim().toLowerCase();

      // Check if the result is valid and handle accordingly
      if (existingPendingUser === undefined) {
        throw new Error("Unexpected result from database query.");
      }
      if (existingPendingUser) {
        throw new Error(
          "A verification email was already sent. Please check your inbox.",
        );
      }

    const existingPendingUser = await PendingUser.findOne({
      email: trimmedEmail,
    });

    logInfo(
      "existingPendingUser:",
      existingPendingUser ? existingPendingUser : "No pending user found",
    );

    // Check if the user already exists
    if (existingUser) {
      throw new Error("Email is already registered. Please log in instead.");
    }


    // Check if user is of right age
    const birthdateObj = new Date(userDataCopy.birthdate); // Assuming the birthdate is passed in the body
    if (isNaN(birthdateObj.getTime())) {
      throw new Error("Invalid birthdate.");
    }

    userData.birthdate = new Date(userData.birthdate);
    const currentDate = new Date();
    let age = currentDate.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = currentDate.getMonth() - birthdateObj.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && currentDate.getDate() < birthdateObj.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      throw new Error("Invalid birthdate.");
    }

    // Generate verification token with expiration time using JWT
    const verificationToken = jwt.sign(
      { email, firstName, lastName },
      process.env.JWT_SECRET,
      { expiresIn: "6h" },
    );

    // Prepare and store pending user
    const newPendingUser = new PendingUser({
      firstName,
      lastName,
      email,
      password,
      birthdate: userData.birthdate,
      isSubscribed,
      verificationToken,
    });

    try {
      await newPendingUser.save();
      logInfo("Pending user created:", newPendingUser);
    } catch (error) {
      logError("Error creating pending user:", error.message, error.stack);
      throw new Error(`Error creating pending user: ${error.message}`);
    }

    // Prepare email data for verification email
    const emailData = {
      to: email,
      subject: "Please Verify Your Email Address",
      templateName: "verifyEmailTemplate",
      templateData: {
        firstName,
        lastName,
        verificationLink: `${process.env.API_URL_LOCAL}/verify?token=${verificationToken}`,
      },
    };

    // Create a mock req object
    const mockReq = {
      body: emailData,
    };

    // Send verification mail
    await sendEmailController(mockReq);

    // return newPendingUser
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
