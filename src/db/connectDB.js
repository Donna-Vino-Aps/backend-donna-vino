import mongoose from "mongoose";
import { logError, logInfo } from "../util/logging.js";

const connectDB = () => {
  return new Promise((resolve, reject) => {
    mongoose.set("strictQuery", false);

    const dbURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI_PRODUCTION
        : process.env.MONGODB_URI;

    mongoose
      .connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
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
