import { sendEmailController } from "../utils/sendEmailController";
import { signUpUser } from "../../models/pendingUserModel";
const { logInfo, logError } = require("../../utils/logging");
import PendingUser from "../models/pendingUserModel";
import User from "../models/userModels";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

router.post("/pendingsignup", async (req, res) => {
  try {
    const userData = req.body; // Assuming the request body contains user data
    const newUser = await signUpUser(userData);
    res.status(201).json({
      message:
        "Pending user created successfully. Please check your email to verify your account.",
      user: newUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a pending user
export const createPendingUser = async (req, res) => {
  const { firstName, lastName, email, password, birthdate } = req.body;

  // Validate user data
  if (!firstName || !lastName || !email || !password || !birthdate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    // Check if email already exists in pending users-collection
    const existingPendingUser = await PendingUser.findOne({ email });
    if (existingPendingUser) {
      return res
        .status(400)
        .json({ message: "Verification email was already sent." });
    }

    // Check if user is of right age
    const birthdateObj = new Date(birthdate); // Assuming the birthdate is passed in the body
    if (isNaN(birthdateObj.getTime())) {
      return res.status(400).json({ message: "Invalid birthdate." });
    }

    const currentDate = new Date();
    const age = currentDate.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = currentDate.getMonth() - birthdateObj.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && currentDate.getDate() < birthdateObj.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      return res
        .status(400)
        .json({ message: "You must be at least 18 years old to register." });
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

    // Store pending user
    const pendingUser = new PendingUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 86400000),
    });

    await pendingUser.save();
    logInfo("Pending user created:", pendingUser);

    // Prepare email data for verification email
    const emailData = {
      to: email,
      subject: "Please Verify  Your Email Address",
      templateName: "verifyEmailTemplate",
      templateData: {
        firstName,
        lastName,
        verificationLink: `${process.env.API_URL_LOCAL}/verify?token=${verificationToken}`,
      },
    };

    // Send verification mail
    const emailResponse = await sendEmailController(emailData);

    res.status(201).json({
      message:
        "Pending user created successfully. Please check your email to verify your account.",
      data: emailResponse,
    });
  } catch (error) {
    logError("Error creating pending user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// verify a pending user
export const verifyPendingUser = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  try {
    // Find the pending user by verification token
    const pendingUser = await PendingUser.findOne({ verificationToken: token });

    if (!pendingUser) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Check if the verification-token has expired
    if (pendingUser.verificationTokenExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "Verification token has expired." });
    }

    // Transfer to main users collection
    const { firstName, lastName, email, password } = pendingUser;
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
    });

    await newUser.save();

    // Delete the user from the pending user collection
    await PendingUser.findByIdAndDelete(pendingUser._id);

    logInfo("User verified and moved to main users:", newUser);

    res.status(200).json({ message: "User verified successfully." });
  } catch (error) {
    logError("Error verifying pending user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// resending the verification mail if token is expired, or user requests a new one
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // check if email exists in pending users-collection
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res
        .status(400)
        .json({ message: "No pending user found with this email." });
    }

    // Generate new verification token with expiration time using JWT
    const verificationToken = jwt.sign(
      {
        email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Update the pending user with new token and expiration time
    pendingUser.verificationToken = verificationToken;
    pendingUser.verificationTokenExpires = new Date(Date.now() + 86400000);

    await pendingUser.save();
    logInfo("Verification email resent for:", pendingUser);

    // Prepare email data for verification email
    const emailData = {
      to: email,
      subject: "Please Verify Your Email Address",
      templateName: "verifyEmailTemplate",
      templateData: {
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        verificationLink: `${process.env.API_URL_LOCAL}/verify?token=${verificationToken}`,
      },
    };

    // Send verification mail
    const emailResponse = await sendEmailController(emailData);

    res.status(200).json({
      message: "A new verification email has been sent.",
      data: emailResponse,
    });
  } catch (error) {
    logError("Error resending verification email:", error);
    res.status(500).json({ message: "Server error" });
  }
};
