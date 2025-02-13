import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const resolvePath = (relativePath) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, relativePath);
};

const subscribeUser = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const welcomeTemplatePath = resolvePath(
    "../../templates/emailWelcomeTemplate.html",
  );

  if (!fs.existsSync(welcomeTemplatePath)) {
    console.error(
      `Welcome email template not found at: ${welcomeTemplatePath}`,
    );
    return res.status(500).json({
      error: "Internal server error: Template not found",
    });
  }

  let welcomeEmailTemplate;
  try {
    welcomeEmailTemplate = fs.readFileSync(welcomeTemplatePath, "utf-8");
  } catch (error) {
    console.error(`Error reading welcome email template: ${error.message}`);
    return res.status(500).json({
      error: "Internal server error",
    });
  }

  welcomeEmailTemplate = welcomeEmailTemplate.replace("{{EMAIL}}", email);

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Subscription Confirmation",
    html: welcomeEmailTemplate,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send confirmation email",
        error: error.message || "Failed to send confirmation email",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription successful! Check your email for confirmation.",
    });
  });
};

export { subscribeUser };
