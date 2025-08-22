import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { Resend } from "resend";
import { logInfo, logError } from "./logging.js";

export const sendEmail = async (to, subject, content, isHtml = true) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
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
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailOptions = {
      from: `"Donna Vino" <${process.env.INFO_EMAIL}>`,
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

export const updateContactStatus = async ({ email, unsubscribed }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const updateOptions = {
      audienceId: process.env.RESEND_AUDIENCE_ID,
      unsubscribed,
      email,
    };
    const data = await resend.contacts.update(updateOptions);
    logInfo(
      `Contact updated to ${
        unsubscribed ? "unsubscribed" : "subscribed"
      }: ${JSON.stringify(data)}`,
    );
    return data;
  } catch (error) {
    logError(
      `Error updating contact to ${
        unsubscribed ? "unsubscribed" : "subscribed"
      }:`,
      error,
    );
    throw error;
  }
};

export const addContactToResend = async (email) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const contactOptions = {
      email,
      unsubscribed: false,
      audienceId: process.env.RESEND_AUDIENCE_ID,
    };
    let data;
    try {
      data = await resend.contacts.create(contactOptions);
      // After creation, update status to ensure it is subscribed.
      data = await updateContactStatus({ email, unsubscribed: false });
      logInfo(
        `Contact created and updated to subscribed: ${JSON.stringify(data)}`,
      );
    } catch (error) {
      if (
        error?.error?.message &&
        error.error.message.toLowerCase().includes("already exists")
      ) {
        data = await updateContactStatus({ email, unsubscribed: false });
        logInfo(`Contact updated to subscribed: ${JSON.stringify(data)}`);
      } else {
        throw error;
      }
    }
    return data;
  } catch (error) {
    logError(`Error adding/updating ${email} to Resend audience:`, error);
    throw error;
  }
};
