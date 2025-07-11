/**
 * Token base model definition using Mongoose.
 *
 * This model supports discriminator-based extensions (e.g., AccessToken, RefreshToken),
 * includes auto-expiring tokens via MongoDB TTL index on `expiresAt`,
 * and provides utility methods for issuing, expiring, and revoking tokens.
 */

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import ms from "ms";

/**
 * @typedef {Object} TokenDocument
 * @property {mongoose.Types.ObjectId} user - Reference to the User model
 * @property {string} token - Signed JWT token string
 * @property {Date} createdAt - Timestamp when token was issued
 * @property {Date} expiresAt - Timestamp when token should expire
 * @property {Function} isExpired - Checks if the token is already expired
 * @property {Function} revoke - Deletes the token from the database
 */

/**
 * Token schema shared by all token types (used via discriminators).
 */

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    discriminatorKey: "kind", // Allows token types to extend from this model
    timestamps: false, // No auto-updated createdAt/updatedAt
  },
);

// TTL index: automatically removes tokens after their `expiresAt` timestamp
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Issues and saves a signed JWT token tied to a user.
 *
 * This method is typically used to generate verification or access tokens for a specific
 * user. The generated token is stored in the database and can later be validated or revoked.
 *
 * Can be used standalone or integrated into higher-level token classes (e.g., EmailVerificationToken).
 *
 * @param {Object} options - Configuration options
 * @param {mongoose.Types.ObjectId} options.userId - User ID the token is associated with
 * @param {string} [options.expiresIn='15m'] - Expiration time (e.g., '15m', '2h')
 * @param {Object} [options.payload={}] - Additional JWT claims (e.g., { email, role })
 * @param {string} [options.secret=process.env.JWT_SECRET] - Secret key used for signing the token
 * @param {Object} [options.extras={}] - Additional fields to include in the Token document (e.g., type, targetClass)
 *
 * @returns {Promise<TokenDocument>} A Mongoose document containing the issued token
 */

tokenSchema.statics.issueToken = async function ({
  userId,
  expiresIn = "15m",
  payload = {},
  secret = process.env.JWT_SECRET,
  extras = {},
}) {
  const exp = Math.floor((Date.now() + ms(expiresIn)) / 1000);
  const jwtPayload = {
    sub: userId.toString(),
    exp,
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  };

  const token = jwt.sign(jwtPayload, secret);

  const tokenDoc = new this({
    ...extras,
    user: userId,
    token,
    expiresAt: new Date(exp * 1000),
  });

  await tokenDoc.save();
  return tokenDoc;
};

/**
 * Verifies a JWT token and returns the corresponding token document from DB.
 * This ensures the token is both valid and not revoked (i.e., still stored).
 *
 * @param {string} token - The JWT token string
 * @param {boolean} [ignoreExpiration=false] - Whether to ignore expiration check
 * @param {string} [secret=process.env.JWT_SECRET] - Secret used to verify token
 * @returns {Promise<(TokenDocument & { decoded?: Object }) | null>} The token document with decoded payload or null
 */
tokenSchema.statics.fromJWT = async function (
  token,
  ignoreExpiration = false,
  secret = process.env.JWT_SECRET,
) {
  try {
    jwt.verify(token, secret, { ignoreExpiration });
  } catch (err) {
    return null; // Signature invalid, malformed, or expired (unless ignored)
  }

  return await this.findOne({ token });
};

/**
 * Checks whether the token is expired based on `expiresAt`.
 *
 * @returns {boolean} True if token is expired, false otherwise
 */
tokenSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/**
 * Deletes the token from the database (used to revoke it).
 *
 * @returns {Promise<void>}
 */
tokenSchema.methods.revoke = async function () {
  await this.constructor.findByIdAndDelete(this._id);
};

/**
 * Token base model (used for discriminators like AccessToken, RefreshToken, etc.)
 */
const Token = mongoose.model("Token", tokenSchema);
export default Token;
