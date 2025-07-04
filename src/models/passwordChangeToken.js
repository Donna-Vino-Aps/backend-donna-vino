import Token from "./token.js";
import mongoose from "mongoose";

const passwordChangeTokenSchema = new mongoose.Schema({
  email: [String],
});

passwordChangeTokenSchema.statics.issueToken = async function ({
  userId,
  email,
  expiresIn = "30m",
  payload = {},
  secret = process.env.JWT_SECRET,
}) {
  // Delegate to base Token logic while preserving this discriminator context
  return Token.issueToken.call(this, {
    userId,
    expiresIn,
    payload,
    secret,
    extras: { email: email },
  });
};

const PasswordChangeToken = Token.discriminator(
  "PasswordChangeToken",
  passwordChangeTokenSchema,
);
export default PasswordChangeToken;
