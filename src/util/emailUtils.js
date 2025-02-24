import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { Resend } from "resend";

export const sendEmail = async (to, subject, html) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY); // API key is loaded at runtime

    const data = await resend.emails.send({
      from: `"Donna Vino" <${process.env.AUTH_EMAIL}>`,
      to,
      subject,
      html,
    });

    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
