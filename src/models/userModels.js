import mongoose from "mongoose";
import bcrypt from "bcrypt";
import AccessToken from "./accessToken.js";
import RefreshToken from "./refreshToken.js";
import EmailVerificationToken from "./emailVerificationToken.js";
import PasswordChangeToken from "./passwordChangeToken.js";

const SALT_ROUNDS = 10;

/**
 * Mongoose schema for a User.
 * @typedef {Object} UserDocument
 * @property {string} email - Unique email address for login/identity
 * @property {string} [password] - Hashed password string (optional for SSO users)
 * @property {string} [firstName] - User's first name
 * @property {string} [lastName] - User's last name
 * @property {string} [address] - User's address
 * @property {string} [country] - User's country
 * @property {Date} createdAt - Date the user was created
 */

const nameRegex = /^[a-zA-ZÆØÅæøå0-9]+(?:[-\s][a-zA-ZÆØÅæøå0-9]+)*$/;
const emailRegex =
  /^[a-zA-ZÆØÅæøå0-9](?:[\wÆØÅæøå.-]*[a-zA-ZÆØÅæøå0-9])?@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
// Updated user schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      match: [
        nameRegex,
        "First name can only contain letters, numbers, and a single space between words.",
      ],
    },
    lastName: {
      type: String,
      required: [
        function () {
          return this.authProvider === "local";
        },
        "Last name is required.",
      ],
      trim: true,
      match: [
        nameRegex,
        "Last name can only contain letters, numbers, and a single space between words.",
      ],
    },
    address: { type: String, trim: true },
    country: { type: String, trim: true },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [emailRegex, "Email format is invalid."],
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: [8, "Password must be at least 8 characters long."],
      validate: {
        validator: function (v) {
          // if special character included
          if (!/[\wÆØÅæøå]/.test(v)) return false;
          // if digits included
          if (!/[0-9]/.test(v)) return false;
          // if uppercase letter included
          if (!/[A-ZÆØÅ]/.test(v)) return false;
          // if lowercase letter included
          return /[a-zæøå]/.test(v);
        },
        message:
          "Password must contain at least one uppercase letter and one special character.",
      },
    },
    dateOfBirth: {
      type: Date,
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
    googleId: { type: String },
    picture: { type: String },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

/**
 * Pre-save middleware to hash the password if it's not already hashed.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  // Avoid double-hashing
  if (this.password.startsWith("$2")) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compares a plaintext password to the stored bcrypt hash.
 *
 * @param {string} password - Plaintext password to compare
 * @returns {Promise<boolean>} True if matched, false otherwise
 */
userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

/**
 * Issues a new access token and corresponding refresh token for this user.
 *
 * @returns {Promise<{ accessToken: String, refreshToken: String }>} A pair of tokens
 */
userSchema.methods.issueAccessTokens = async function () {
  const accessToken = await AccessToken.issueToken({ userId: this._id });
  const refreshToken = await RefreshToken.issueToken({
    userId: this._id,
    accessToken: accessToken.token,
  });
  return { accessToken: accessToken.token, refreshToken: refreshToken.token };
};

/**
 * Issues an email verification token tied to the user's email.
 *
 * @returns {Promise<String>} The email verification token
 */
userSchema.methods.issueEmailVerificationToken = async function () {
  const token = await EmailVerificationToken.issueToken({
    userId: this._id,
    email: this.email,
  });
  return token.token;
};

/**
 * Issues a short-lived token that allows the user to reset their password.
 *
 * @returns {Promise<String>} The password reset token
 */
userSchema.methods.issueResetPasswordToken = async function () {
  const token = await PasswordChangeToken.issueToken({ userId: this._id });
  return token.token;
};

/**
 * User model representing both local and SSO users (if applicable).
 */
const User = mongoose.model("User", userSchema);

export default User;
