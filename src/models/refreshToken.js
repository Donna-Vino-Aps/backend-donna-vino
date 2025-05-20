/**
 * RefreshToken discriminator model extending the base Token schema.
 *
 * This model tracks renewable tokens (e.g., refresh tokens) and holds a reference
 * to the last access token issued. It supports issuing new access tokens as long
 * as the current one matches, and the refresh token hasn't expired or been revoked.
 */

import Token from "./token.js";
import AccessToken from "./accessToken.js";
import mongoose from "mongoose";

/**
 * Mongoose schema for RefreshToken adds reference to the last issued access token string.
 * @typedef {Object} RefreshTokenDocument
 * @property {string} lastAccessToken - The last access token that was issued with this refresh token
 */
const refreshTokenSchema = new mongoose.Schema({
  lastAccessToken: [String],
});

/**
 * Issues a new refresh (renew) token and persists it in the database.
 *
 * This method:
 * - Sets a long expiration (default: 30 days)
 * - Optionally associates an existing access token string with the refresh token
 * - Uses base Token's logic for signing and saving
 *
 * @param {Object} options
 * @param {mongoose.Types.ObjectId} options.userId - The user to associate with the token
 * @param {string} options.accessToken - Last access token issued (JWT string)
 * @param {string} [options.expiresIn='30d'] - Token TTL string
 * @param {Object} [options.payload={}] - Additional claims to embed in the JWT
 * @param {string} [options.secret=process.env.API_SECRET] - JWT signing secret
 * @returns {Promise<RefreshTokenDocument>} A new, saved refresh token document
 */
refreshTokenSchema.statics.issueToken = async function ({
  userId,
  accessToken,
  expiresIn = "30d",
  payload = {},
  secret = process.env.API_SECRET,
}) {
  return await Token.issueToken.call(this, {
    userId,
    expiresIn,
    payload,
    secret,
    extras: { lastAccessToken: accessToken },
  });
};

/**
 * Issues a new access token using this refresh token.
 *
 * Requirements:
 * - Refresh token must not be expired
 * - Provided access token must match the last one issued
 *
 * This method:
 * - Verifies the token is not expired
 * - Verifies the current access token matches lastAccessToken
 * - Issues a new access token
 * - Updates lastAccessToken to the new value
 *
 * @param {string} lastAccessToken - The JWT string of the last access token
 * @returns {Promise<AccessTokenDocument|null>} New access token or null if invalid
 */
refreshTokenSchema.methods.issueNewAccessToken = async function (
  lastAccessToken,
) {
  if (this.isExpired?.() || this.revoked) return null;
  if (lastAccessToken !== this.lastAccessToken?.[0]) return null;

  const newAccessToken = await AccessToken.issueToken({
    userId: this.user,
  });

  this.lastAccessToken = [newAccessToken.token];
  await this.save();

  return newAccessToken;
};

/**
 * RefreshToken model — stored in the shared `tokens` collection
 * and identified by `kind: "RefreshToken"`.
 */
const RefreshToken = Token.discriminator("RefreshToken", refreshTokenSchema);
export default RefreshToken;
