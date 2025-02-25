import PendingUser from "../models/pendingUserModel.js";
import User from "../models/userModels.js";
import { validatePendingUserData } from "../util/validatePendingUserData.js";
import { logInfo, logError } from "../util/logging.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmailController } from "../controllers/sendEmailControllers/sendEmailController.js";

export const signUpUser = async (userData) => {
  try {
    validatePendingUserData(userData);

    const { firstName, lastName, email, password, birthdate } = userData;
    const userDataCopy = { ...userData };

    const existingUser = await User.exists({ email: userData.email });

    // Check if the user already exists
    if (existingUser) {
      throw new Error("Email is already registered. Please log in instead.");
    }

    // check if the email is already in the pendingUser-collection
    const existingPendingUser = await PendingUser.exists({
      email: userData.email,
    });
    if (existingPendingUser) {
      throw new Error(
        "A verification email was already sent. Please check your inbox.",
      );
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
      throw new Error("You must be at least 18 years old to register.");
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token with expiration time using JWT
    const verificationToken = jwt.sign(
      { email, firstName, lastName },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Prepare and store pending user
    const newPendingUser = new PendingUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      birthdate: userData.birthdate,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 21600000), // 6 hours
    });

    await newPendingUser.save();
    logInfo("Pending user created:", newPendingUser);

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
