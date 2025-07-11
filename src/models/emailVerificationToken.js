/**
 * EmailVerificationToken discriminator model extending the base Token schema.
 *
 * This model adds an `email` field (typically used to verify a user's email address)
 * and overrides `issueToken()` to embed the email in the signed JWT payload.
 * It reuses the base Token model's JWT generation and persistence logic.
 */

import Token from "./token.js";
import mongoose from "mongoose";

/**
 * Mongoose schema for EmailVerificationToken adds the target email address.
 * @typedef {Object} EmailVerificationTokenDocument
 * @property {string[]} email - The email(s) this token is intended to verify
 */
const emailVerificationTokenSchema = new mongoose.Schema({
  email: [String],
});

/**
 * Issues a signed JWT token for email verification and persists it to the database.
 *
 * This method overrides the base `Token.issueToken()` to:
 * - Set a custom default expiration of 1 day (`1d`)
 * - Embed the email address in the JWT payload
 * - Use the base Token's logic for signing and saving
 *
 * @param {Object} options
 * @param {mongoose.Types.ObjectId} options.userId - The user to associate with the token
 * @param {string|string[]} options.email - One or more email addresses to verify
 * @param {string} [options.expiresIn='1d'] - Duration string like '1d', '2h'
 * @param {Object} [options.payload={}] - Additional JWT claims to include
 * @param {string} [options.secret=process.env.JWT_SECRET] - JWT signing secret
 * @returns {Promise<EmailVerificationTokenDocument>} A new, saved verification token document
 */
emailVerificationTokenSchema.statics.issueToken = async function ({
  userId,
  email,
  expiresIn = "1d",
  payload = {},
  secret = process.env.JWT_SECRET,
}) {
  const extendedPayload = {
    ...payload,
    email: email,
  };

  // Delegate to base Token logic while preserving this discriminator context
  return await Token.issueToken.call(this, {
    userId,
    expiresIn,
    payload: extendedPayload,
    secret,
    extras: { email: email },
  });
};

/**
 * EmailVerificationToken model — stored in the shared `tokens` collection
 * and identified by `kind: "EmailVerificationToken"`.
 */
const EmailVerificationToken = Token.discriminator(
  "EmailVerificationToken",
  emailVerificationTokenSchema,
);
export default EmailVerificationToken;
