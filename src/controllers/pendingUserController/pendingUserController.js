import express from "express"; // Import express
const app = express();
import { sendEmailController } from "../sendEmailControllers/sendEmailController.js";
import { signup } from "../authControllers/signupController.js";
import { logInfo, logError } from "../../util/logging.js";
import PendingUserModel from "../../models/pendingUserModel.js";
import { signUpUser } from "../../services/authService.js";
// import User from "../../models/userModels.js";
import jwt from "jsonwebtoken";

app.use(express.json());

// Create a pending user function
export const createPendingUser = async (req, res) => {
  try {
    const userData = req.body;
    logInfo("User Data received for sign-up:", userData);

    // Call the signUpUser function from the authService
    const newUser = await signUpUser(req.body);

    res.status(201).json({
      message:
        "Pending user created successfully. Please check your email to verify your account.",
      data: newUser,
    });
  } catch (error) {
    logError("Error creating pending user:", error.message, error.stack);
    res.status(500).json({ message: "Server error 1", details: error.message });
  }
};

// verify a pending user
export const verifyPendingUser = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the pending user by email
    const pendingUser = await PendingUserModel.findOne({
      email: decoded.email,
    });

    if (!pendingUser) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // // Transfer to main users collection OLD
    // const { firstName, lastName, email, password, isSubscribed } = pendingUser;
    // const newUser = new User({
    //   firstName,
    //   lastName,
    //   email,
    //   password,
    //   isSubscribed,
    // });
    // await newUser.save();

    // Call signup from signUpController
    const signupRequest = {
      body: {
        user: {
          firstName: pendingUser.firstName,
          lastName: pendingUser.lastName,
          email: pendingUser.email,
          password: pendingUser.password,
          dateOfBirth: pendingUser.dateOfBirth,
          isSubscribed: pendingUser.isSubscribed ?? false,
        },
      },
    };

    // Call the signup function
    await signup(signupRequest, res);

    // If signup succeeds, delete the pending user
    await PendingUserModel.findByIdAndDelete(pendingUser._id);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "Verification token has expired. Please request a new one.",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token." });
    }

    return res
      .status(500)
      .json({ message: "Server error 2", details: error.message });
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
    const pendingUser = await PendingUserModel.findOne({ email });

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
    pendingUser.verificationTokenExpires = new Date(Date.now() + 21600000);

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
    res.status(500).json({ message: "Server error 3" });
  }
};
