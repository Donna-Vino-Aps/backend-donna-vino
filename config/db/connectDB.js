import mongoose from "mongoose";
import { logInfo, logError } from "../../src/utils/logging.js";

const connectDB = () => {
  return new Promise((resolve, reject) => {
    mongoose.set("strictQuery", false);

    mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        logInfo("MongoDB connected successfully");
        resolve();
      })
      .catch((error) => {
        logError("Error connecting to MongoDB:", error);
        reject(error);
      });
  });
};

export default connectDB;
