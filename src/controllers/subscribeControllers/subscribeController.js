import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASSWORD,
  },
});

const resolvePath = (relativePath) => {
  const basePath = new URL(".", import.meta.url).pathname;
  return path.resolve(basePath, relativePath);
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

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Subscription Confirmation",
    html: welcomeEmailTemplate,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res
        .status(500)
        .json({ error: "Failed to send confirmation email" });
    }

    res.status(200).json({
      message: "Subscription successful! Check your email for confirmation.",
    });
  });
};

export { subscribeUser };
