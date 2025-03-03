import mongoose from "mongoose";

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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

export const validateEmail = (email) => {
  const errorMessages = [];
  if (!email || email.trim() === "") {
    errorMessages.push("Email is a required field.");
  }
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errorMessages.push("Email is not in a valid format.");
  }
  return errorMessages;
};

const SubscribedUser = mongoose.model("SubscribedUser", subscribedUserSchema);

export default SubscribedUser;
