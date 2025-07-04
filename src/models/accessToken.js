/**
 * AccessToken discriminator model extending the base Token schema.
 *
 * This model adds a `scope` field and overrides `issueToken()` to apply a default
 * set of OAuth/OpenID scopes (e.g., 'sub', 'email', 'profile').
 * It delegates actual token creation to the base Token model using `Token.issueToken`.
 */

import Token from "./token.js";
import mongoose from "mongoose";

/**
 * Mongoose schema for AccessToken extends Token with a scope array.
 * @typedef {Object} AccessTokenDocument
 * @property {string[]} scope - OAuth/OpenID scopes granted to this access token
 */

const accessTokenSchema = new mongoose.Schema({
  scope: [String],
});

/**
 * Issues a signed JWT access token and persists it to the database.
 *
 * This method overrides the base `Token.issueToken()` to:
 * - Set a custom default expiration time (15m)
 * - Append a standard scope payload (`['sub', 'email', 'profile']`)
 * - Call the base issue logic via `Token.issueToken.call(this, ...)`
 *
 * @param {Object} options
 * @param {mongoose.Types.ObjectId} options.userId - The user to associate with the token
 * @param {string} [options.expiresIn='15m'] - Duration string like '15m', '1h'
 * @param {Object} [options.payload={}] - Custom JWT claims to include
 * @param {string[]} [options.scope=['sub', 'email', 'profile']] - Scopes to embed in payload
 * @param {string} [options.secret=process.env.JWT_SECRET] - JWT signing secret
 * @returns {Promise<AccessTokenDocument>} A new, persisted access token document
 */
accessTokenSchema.statics.issueToken = async function ({
  userId,
  expiresIn = "15m",
  payload = {},
  scope = ["sub", "email", "profile"],
  secret = process.env.JWT_SECRET,
}) {
  // Add scope into the JWT payload
  const extendedPayload = {
    ...payload,
    scope,
  };

  // Use base Token logic, passing `this` to maintain the discriminator context
  return Token.issueToken.call(this, {
    userId,
    expiresIn,
    payload: extendedPayload,
    secret,
  });
};

/**
 * AccessToken model — stored in the same collection as Token but distinguished by `kind: "AccessToken"`.
 */
const AccessToken = Token.discriminator("AccessToken", accessTokenSchema);
export default AccessToken;
