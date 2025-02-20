import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { __dirname } from "../../util/globals.js";
import { createTransporter } from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import { logError, logInfo } from "../../util/logging.js";

const resolvePath = (relativePath) => path.resolve(__dirname, relativePath);

const readTemplate = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found at: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
};

const createVerificationRecord = async (userId, uniqueString) => {
  const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
  const newVerification = new UserVerification({
    userId,
    uniqueString: hashedUniqueString,
    createdAt: Date.now(),
    expiresAt: Date.now() + 21600000, // 6 hours
  });
  await newVerification.save();
};

export const sendWelcomeEmail = async (user) => {
  try {
    logInfo("Step 1: Extracting user data...");
    const { _id, email } = user;
    const uniqueString = uuidv4() + _id;

    logInfo("Step 2: Reading email template...");
    const welcomeTemplatePath = resolvePath(
      "../templates/emailWelcomeTemplate.html",
    );
    const welcomeEmailTemplate = readTemplate(welcomeTemplatePath);

    logInfo("Step 3: Hashing unique string...");
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);

    logInfo("Step 4: Saving verification record...");
    await createVerificationRecord(_id, hashedUniqueString);

    logInfo("Step 5: Creating transporter...");
    const transporter = createTransporter();
    logInfo(
      "Step 5b: Checking sendMail function exists?",
      !!transporter.sendMail,
    );

    const emailResponse = await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Welcome to Donna Vinno Aps",
      html: welcomeEmailTemplate,
    });

    logInfo("Step 5d: Email sent response:", emailResponse);
    return {
      status: "PENDING",
      message: "Welcome email sent",
      data: { userId: _id, email },
    };
  } catch (error) {
    logError?.(`Welcome email failed: ${error.message}`);
    return { status: "FAILED", message: "Welcome email failed" };
  }
};
