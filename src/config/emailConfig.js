import nodemailer from "nodemailer";
import { logError, logInfo } from "../util/logging.js";
import dotenv from "dotenv";

dotenv.config();

export const createTransporter = (config = null) => {
  const transporterConfig = config || {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: (process.env.AUTH_PASSWORD || "").trim(),
    },
  };

  return nodemailer.createTransport(transporterConfig);
};

// Create a default transporter for production
const transporter = createTransporter();

export const verifyTransporter = (transporterInstance = transporter) => {
  transporterInstance.verify((error) => {
    if (error) {
      logError(error);
    } else {
      logInfo("Ready for messages");
      logInfo("Success");
    }
  });
};

// Exporting transporter as default
export default transporter;
