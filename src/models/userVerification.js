import mongoose from "mongoose";
const { Schema } = mongoose;

const UserVerificationSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  uniqueString: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const UserVerification = mongoose.model(
  "UserVerification",
  UserVerificationSchema,
);

export default UserVerification;
