import Token from "./token.js";
import mongoose from "mongoose";
/**
 * SubscriptionVerificationToken model for managing subscription verification tokens.
 * This model extends the Token model and is used to handle subscription-related token operations.
 *
 * @module SubscriptionVerificationToken
 */

const SubscriptionVerificationToken = Token.discriminator(
  "SubscriptionVerificationToken",
  new mongoose.Schema(
    { expiresAt: { type: Date, default: null } }, // No Expiry date by default
    { discriminatorKey: "kind" },
  ),
);

export default SubscriptionVerificationToken;
