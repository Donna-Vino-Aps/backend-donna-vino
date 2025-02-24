import mongoose from "mongoose";
import User from "./userModels.js";
import PendingUser from "./pendingUserModel.js";
import { logInfo, logError } from "../util/logging.js";
import bcrypt from "bcryptjs";

// Connecting to the MongoDB databaseconst
const MONGO_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logInfo("Connected to MongoDB"))
  .catch((error) => logError("MongoDB Connection Error:", error));
mongoose.set("strictQuery", false);

// Defining the schema for the pending user
const pendingUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  verificationToken: { type: String, required: true },
  verificationTokenExpires: { type: Date, required: true },
});

async function signUpUser(userData) {
  try {
    const existingUser = await User.findOne({ email: userData.email });

    // Check if the user already exists
    if (existingUser) {
      throw new Error("Email is already registered. Please log in instead.");
    }

    // check if the email is already in the pendingUser-collection
    const existingPendingUser = await PendingUser.findOne({
      email: userData.email,
    });
    if (existingPendingUser) {
      throw new Error(
        "A verification email was already sent. Please check your inbox.",
      );
    }

    // creating a new pendingUser-document and saving a new pending user
    const newUser = new PendingUser(userData);
    await newUser.save();

    logInfo("Pending User Created:", newUser);
    return newUser;
  } catch (error) {
    console.error("Signup Error:", error.message);
    throw error;
  }
}

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
const PendingUserModel = mongoose.model("PendingUser", pendingUserSchema);

// Exporting the model
export default PendingUserModel;

// Exporting the signUpUser function
export { signUpUser };
