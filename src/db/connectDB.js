// import mongoose from "mongoose";
// import { logError, logInfo } from "../util/logging.js";
//
// const connectDB = () => {
//   return new Promise((resolve, reject) => {
//     mongoose.set("strictQuery", false);
//
//     const currentEnv = process.env.NODE_ENV || "not defined";
//     logInfo(`Current NODE_ENV: ${currentEnv}`); // Log to check environment variable
//
//     const dbURI =
//       currentEnv === "production"
//         ? process.env.MONGODB_URI_PRODUCTION
//         : process.env.MONGODB_URI;
//
//     mongoose
//       .connect(dbURI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       })
//       .then(() => {
//         logInfo("MongoDB connected successfully");
//         resolve();
//       })
//       .catch((error) => {
//         logError("Error connecting to MongoDB:", error);
//         reject(error);
//       });
//   });
// };
//
// export default connectDB;

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGODB_URI;
    if (!dbURI) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: "admin",
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
