import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Defining the schema for the pending user
const pendingUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthdate: { type: Date, required: true },
  verificationToken: { type: String, required: true },
  verificationTokenExpires: { type: Date, required: true },
});

// Hashing the password
pendingUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Creating the model for the pending user
const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

// Exporting the model
export default PendingUser;
