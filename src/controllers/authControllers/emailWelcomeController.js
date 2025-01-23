import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import transporter from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import { logError, logInfo } from "../../util/logging.js";

const resolvePath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

// Function to send a welcome email
export const sendWelcomeEmail = async (user) => {
  const { _id, email } = user;
  const uniqueString = uuidv4() + _id; // Generate a unique string using uuid and user ID

  const welcomeTemplatePath = resolvePath(
    "/Users/leninortizreyes/Desktop/ZenTimerAppServer/templates/emailWelcomeTemplate.html",
  );

  let welcomeEmailTemplate;
  try {
    welcomeEmailTemplate = fs.readFileSync(welcomeTemplatePath, "utf-8");
  } catch (error) {
    logError(`Error reading welcome email template: ${error.message}`);
    return {
      status: "FAILED",
      message: "Internal server error",
    };
  }

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Welcome to Zen Timer App",
    html: welcomeEmailTemplate,
  };

  const saltRounds = 10;
  try {
    const hashedUniqueString = await bcrypt.hash(uniqueString, saltRounds);
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 hours
    });

    await newVerification.save(); // Save the verification record

    await transporter.sendMail(mailOptions);
    logInfo("Welcome email sent successfully");

    return {
      status: "PENDING",
      message: "Welcome email sent",
      data: {
        userId: _id,
        email,
      },
    };
  } catch (error) {
    logError(`Welcome email failed: ${error.message}`);
    return {
      status: "FAILED",
      message: "Welcome email failed",
    };
  }
};
