import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { logInfo, logError } from "./src/util/logging.js";
import connectDB from "./src/db/connectDB.js";
import testRouter from "./testRouters.js";

// Define default port if not provided in .env
const port = process.env.PORT || 5000;

// Check if the port is set correctly
if (!port) {
  logError(
    new Error(
      "Cannot find a PORT number. Did you create a .env file and set the PORT variable?",
    ),
  );
  process.exit(1); // Exit process if port is not defined
}

// Start the server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      logInfo(`Server started on port ${port}`);
    });
  } catch (error) {
    logError("Failed to start the server: ", error);
    process.exit(1); // Exit process on connection error
  }
};

// Add test endpoint for non-production environments
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRouter);
}

startServer();
