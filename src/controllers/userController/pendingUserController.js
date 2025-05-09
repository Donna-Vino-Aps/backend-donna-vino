import express from "express";
const app = express();
import { sendEmailController } from "../sendEmailControllers/sendEmailController.js";
import { signUp } from "../authControllers/signupController.js";
import { logInfo, logError } from "../../util/logging.js";
import PendingUserModel from "../../models/pendingUserModel.js";
import { signUpUser } from "../../services/authService.js";
import jwt from "jsonwebtoken";

app.use(express.json());

function buildUrl(base, path) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export const createPendingUser = async (req, res) => {
  try {
    const userData = req.body;
    logInfo("User Data received for sign-up:", userData);

    const newUser = await signUpUser(userData);

    res.status(201).json({
      message:
        "Pending user created successfully. Please check your email to verify your account.",
      data: newUser,
    });
  } catch (error) {
    logError("Error creating pending user:", error.message, error.stack);
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const verifyPendingUser = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const pendingUser = await PendingUserModel.findOne({
      email: decoded.email,
    });

    if (!pendingUser) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

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

    await signUp(signupRequest, res);

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
      .json({ message: "Server error", details: error.message });
  }
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const pendingUser = await PendingUserModel.findOne({ email });

    if (!pendingUser) {
      return res
        .status(400)
        .json({ message: "No pending user found with this email." });
    }

    const verificationToken = jwt.sign(
      {
        email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    pendingUser.verificationToken = verificationToken;
    pendingUser.verificationTokenExpires = new Date(Date.now() + 21600000);

    await pendingUser.save();
    logInfo("Verification email resent for:", pendingUser);

    const emailData = {
      to: email,
      subject: "Please Verify Your Email Address",
      templateName: "verifyEmailTemplate",
      templateData: {
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        verificationLink: buildUrl(
          process.env.API_URL_LOCAL,
          `verify?token=${verificationToken}`,
        ),
      },
    };

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
