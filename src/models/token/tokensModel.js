import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900,
  },
});

export default mongoose.model("Token", tokenSchema);
