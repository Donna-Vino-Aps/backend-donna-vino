import mongoose from "mongoose";
import crypto from "crypto";

const subscribedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
    default: null,
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true, // allow null/undefined values
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

// Automatically generate an unsubscribeToken (random hex string) using crypto if not present
subscribedUserSchema.pre("save", function (next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(32).toString("hex");
  }
  next();
});

const SubscribedUser = mongoose.model("SubscribedUser", subscribedUserSchema);

export default SubscribedUser;
