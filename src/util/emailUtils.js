import dotenv from "dotenv";
import { logError } from "./logging.js";
dotenv.config({ path: ".env.test" });

import { Resend } from "resend";

export const sendEmail = async (to, subject, content, isHtml = true) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY); // API key is loaded at runtime

    const emailOptions = {
      from: `"Donna Vino" <${process.env.NO_REPLY_EMAIL}>`,
      to,
      subject,
      [isHtml ? "html" : "text"]: content,
    };

    const data = await resend.emails.send(emailOptions);

    return data;
  } catch (error) {
    logError("Error sending email:", error);
    throw error;
  }
};

export const contactUsEmail = async (to, subject, content, isHtml = true) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY); // API key is loaded at runtime

    const emailOptions = {
      from: `"Donna Vino" <${process.env.CONTACT_US_EMAIL}>`,
      to,
      subject,
      [isHtml ? "html" : "text"]: content,
    };

    const data = await resend.emails.send(emailOptions);

    return data;
  } catch (error) {
    logError("Error sending email:", error);
    throw error;
  }
};
