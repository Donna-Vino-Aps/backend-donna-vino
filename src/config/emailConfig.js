import nodemailer from "nodemailer";
import { logError, logInfo } from "../util/logging.js";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASSWORD.replace(/\s+/g, ""),
  },
});

// Testing transporter
transporter.verify((error) => {
  if (error) {
    logError(error);
  } else {
    logInfo("Ready for messages");
    logInfo("success");
  }
});

export default transporter;
