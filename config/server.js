// File: server.js
import dotenv from "dotenv";
dotenv.config();

import app from "../src/app.js";
import { logInfo, logError } from "../src/utils/logging.js";
import connectDB from "./db/connectDB.js";

const port = Number(process.env.PORT);

export const startServer = async () => {
  if (!port) {
    logError(
      new Error("Cannot find a PORT number, did you create a .env file?"),
    );
    return;
  }
  try {
    await connectDB();
    app.listen(port, () => {
      logInfo(`Server started on port ${port}`);
    });
  } catch (error) {
    logError(error);
  }
};

if (require.main === module) {
  startServer();
}
