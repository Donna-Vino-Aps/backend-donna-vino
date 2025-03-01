import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import { logInfo } from "../../util/logging.js";

// Updated user schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: {
    type: String,
    trim: true,
    // Required only for manual sign-up
    required: function () {
      return this.authProvider === "local";
    },
  },
  dateOfBirth: {
    type: String,
    trim: true,
    // Required only for manual sign-up
    required: function () {
      return this.authProvider === "local";
    },
  },
  isVip: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false },
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },
  // Optional fields for future or Google sign-in
  googleId: { type: String },
  picture: { type: String },
});

// Pre-save hook to hash the password if modified and only for local sign-up
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.authProvider === "local") {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Updated validation function
export const validateUser = (userObject) => {
  const errorList = [];
  // Allowed keys now include firstName, lastName, email, password, dateOfBirth, and authProvider
  const allowedKeys = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
    "authProvider",
    "isSubscribed",
  ];
  const validatedKeysMessage = validateAllowedFields(userObject, allowedKeys);
  if (validatedKeysMessage.length > 0) {
    errorList.push(validatedKeysMessage);
  }

  if (
    userObject.isSubscribed !== undefined &&
    typeof userObject.isSubscribed !== "boolean"
  ) {
    errorList.push("isSubscribed must be a boolean value (true/false).");
  }

  // Validate firstName
  if (!userObject.firstName || userObject.firstName.trim() === "") {
    errorList.push("First name is a required field.");
  } else if (
    !/^(?:[a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)*)?$/.test(userObject.firstName)
  ) {
    errorList.push(
      "First name can only contain letters, numbers, and a single space between words.",
    );
  }

  // Validate lastName
  if (!userObject.lastName || userObject.lastName.trim() === "") {
    errorList.push("Last name is a required field.");
  } else if (
    !/^(?:[a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)*)?$/.test(userObject.lastName)
  ) {
    errorList.push(
      "Last name can only contain letters, numbers, and a single space between words.",
    );
  }

  // Validate email
  if (!userObject.email || userObject.email.trim() === "") {
    errorList.push("Email is a required field.");
    logInfo("User create Validation failed: Email is required field.");
  } else if (
    !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userObject.email)
  ) {
    errorList.push("Email is not in a valid format.");
  }

  // Determine the authentication provider (defaulting to "local" if not provided)
  const authProvider = userObject.authProvider || "local";

  // For local sign-up, enforce additional validations
  if (authProvider === "local") {
    // Validate password
    if (!userObject.password || userObject.password.trim() === "") {
      errorList.push("Password is a required field.");
    } else {
      if (userObject.password.length < 8) {
        errorList.push("Password must be at least 8 characters long.");
      }
      if (!/[A-Z]/.test(userObject.password)) {
        errorList.push("Password must contain at least one uppercase letter.");
      }
      if (!/[^A-Za-z0-9]/.test(userObject.password)) {
        errorList.push("Password must contain at least one special character.");
      }
    }

    // Validate dateOfBirth
    if (!userObject.dateOfBirth || userObject.dateOfBirth.trim() === "") {
      errorList.push("Date Of Birth is a required field.");
    } else {
      const isValidDateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(
        userObject.dateOfBirth,
      );
      if (!isValidDateOfBirth) {
        errorList.push(
          "Date Of Birth must be in a valid format (YYYY-MM-DD, e.g., '2024-02-04').",
        );
      }
    }
  }

  return errorList;
};

const User = mongoose.model("User", userSchema);
export default User;
