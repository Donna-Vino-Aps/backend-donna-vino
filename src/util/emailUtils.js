import dotenv from "dotenv";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
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
