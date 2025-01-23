// import { logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import User from "../../models/userModels.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  // Check if the request body contains user information
  if (!req.body || typeof req.body !== "object" || !req.body.user) {
    return res
      .status(400)
      .json({ success: false, msg: "Invalid request body" }); // Update error message here
  }

  const { email, password, ...additionalFields } = req.body.user;

  // Validation Errors
  try {
    const errors = [];
    if (!email || !password) {
      errors.push("Email and password are required.");
    }

    if (Object.keys(additionalFields).length > 0) {
      errors.push("Invalid fields present in the request.");
    }

    if (errors.length > 0) {
      const errorMessage = validationErrorMessage(errors);
      res.status(400).json({ success: false, error: errorMessage });
      return;
    }

    // Continue with the login process if there are no validation errors
    const userFound = await User.findOne({ email: email });

    if (userFound) {
      // logInfo(`User found: ${JSON.stringify(userFound)}`);

      const isPasswordValid = await bcrypt.compare(
        password,
        userFound.password,
      );

      // After the comparison

      if (isPasswordValid) {
        // Create jwt token
        const token = jwt.sign(
          { userId: userFound._id.toString() },
          process.env.JWT_SECRET,
        );

        // Save token in cookie
        res.cookie("session", token, {
          maxAge: 86400000,
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: "lax",
        });

        res.status(200).json({
          success: true,
          msg: "Login successful",
          token,
          user: {
            id: userFound._id,
            email: userFound.email,
            name: userFound.name,
          },
        });
      } else {
        res.status(401).json({
          success: false,
          msg: "The password provided is incorrect. Please verify your password and try again.",
        });
      }
    } else {
      res.status(401).json({
        success: false,
        msg: "No user was found associated with the provided email address. Please verify your email and try again or register if you are a new user.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: "An internal server error occurred. Please try again later or contact technical support if the issue persists.",
    });
  }
};
