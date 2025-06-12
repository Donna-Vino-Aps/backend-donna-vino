import Token from "./token.js";
import mongoose from "mongoose";
/**
 * UnsubscribeToken model for managing subscription verification tokens.
 * This model extends the Token model and is used to handle subscription-related token operations.
 *
 * @module UnsubscribeToken
 */

const UnsubscribeToken = Token.discriminator(
  "UnsubscribeToken",
  new mongoose.Schema({ discriminatorKey: "kind" }),
);

export default UnsubscribeToken;
