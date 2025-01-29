import transporter from "../config/emailConfig.js";
import dotenv from "dotenv";
import { logInfo } from "./logging.js";

dotenv.config();

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: "jenssimonberglund@gmail.com",
      subject: "SMPT Test Email",
      text: "Hello, this is a test email using Simply.com SMTP settings.",
    });

    logInfo("Email sent successfully:", info);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

sendTestEmail();
