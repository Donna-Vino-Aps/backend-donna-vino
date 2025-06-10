import mongoose from "mongoose";
import crypto from "crypto";

const subscriptionVerificationTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

// Index to ensure tokens expire after a certain time
subscriptionVerificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

subscriptionVerificationTokenSchema.pre("save", function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(64).toString("hex"); // 128-char hex token
  }
  if (!this.expiresAt) {
    const oneDay = 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + oneDay);
  }
  next();
});

const SubscriptionVerificationToken = mongoose.model(
  "SubscriptionVerificationToken",
  subscriptionVerificationTokenSchema,
);

export default SubscriptionVerificationToken;
