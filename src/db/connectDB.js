import mongoose from "mongoose";
import { logError, logInfo } from "../util/logging.js";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);

    const dbURI = process.env.MONGODB_URI;

    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const dbName =
      process.env.NODE_ENV === "production"
        ? "donna-vino-aps-production"
        : "donna-vino-aps";

    const db = mongoose.connection.useDb(dbName);

    logInfo(`MongoDB connected to database: ${dbName}`);
    return db;
  } catch (error) {
    logError("Error connecting to MongoDB:", error);
    throw error;
  }
};

export default connectDB;
