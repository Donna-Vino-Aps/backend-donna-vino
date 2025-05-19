import Token from "./token.js";
import mongoose from "mongoose";

const passwordChangeTokenSchema = new mongoose.Schema({
  email: [String],
});

passwordChangeTokenSchema.statics.issueToken = async function ({
  userId,
  expiresIn = "30m",
  payload = {},
  secret = process.env.API_SECRET,
}) {
  // Delegate to base Token logic while preserving this discriminator context
  return Token.issueToken.call(this, {
    userId,
    expiresIn,
    payload,
    secret,
  });
};

const PasswordChangeToken = Token.discriminator(
  "PasswordChangeToken",
  passwordChangeTokenSchema,
);
export default PasswordChangeToken;
