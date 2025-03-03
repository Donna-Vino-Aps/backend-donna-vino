import mongoose from "mongoose";

const preSubscribedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PreSubscribedUser = mongoose.model(
  "PreSubscribedUser",
  preSubscribedUserSchema,
);

export default PreSubscribedUser;
