import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import transporter from "../../config/emailConfig.js";
import UserVerification from "../../models/userVerification.js";
import User from "../../models/userModels.js";
import { logError, logInfo } from "../../util/logging.js";

const resolvePath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

// Setting server URL based on the environment
const development = "http://localhost:3000";
const production = "https://zen-timer-app-server-7f9db58def4c.herokuapp.com";
const currentUrl =
  process.env.NODE_ENV === "production" ? production : development;

// Function to send a verification email
export const sendVerificationEmail = async (user) => {
  const { _id, email } = user;
  const uniqueString = uuidv4() + _id; // Generate a unique string using uuid and user ID

  // Read the HTML template
  const templatePath = resolvePath("templates/emailTemplate.html");
  let emailTemplate;

  try {
    emailTemplate = fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    logError(`Error reading email template: ${error.message}`);
    throw new Error("Error reading email template");
  }

  // Replace placeholders with actual values
  const verifyUrl = `${currentUrl}/api/auth/verify/${_id}/${uniqueString}`;
  emailTemplate = emailTemplate.replace("{{VERIFY_URL}}", verifyUrl);

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify your Email",
    html: emailTemplate,
  };

  try {
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 hours
    });

    await newVerification.save(); // Save the verification record
    await transporter.sendMail(mailOptions); // Send the email
    logInfo("Verification email sent successfully");
    return { success: true, message: "Verification email sent" };
  } catch (error) {
    logError(`Failed to send verification email: ${error.message}`);
    throw new Error("Verification email process failed");
  }
};

// Function to resend the verification link
export const resendVerificationLink = async (req, res) => {
  logInfo("Request Body:", req.body);
  try {
    const { email, userId } = req.body;

    if (!userId || !email) {
      const errorMsg = "Empty user details are not allowed";
      logError(errorMsg);
      return res.status(400).json({
        success: false,
        error: errorMsg,
      });
    }

    await UserVerification.deleteMany({ userId });

    const emailSent = await sendVerificationEmail({ _id: userId, email });

    if (!emailSent) {
      const errorMsg = "Failed to send verification email.";
      logError(errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }

    logInfo("Verification link resent successfully.");
    return res.status(200).json({
      success: true,
      msg: "Verification link resent successfully.",
    });
  } catch (error) {
    logError(error);
    return res.status(500).json({
      success: false,
      error: `Verification Link Resend Error: ${error.message}`,
    });
  }
};

// Function to verify the email
export const verifyEmail = (req, res) => {
  logInfo("verifyEmail function called");
  const { userId, uniqueString } = req.params;
  logInfo(`Params - userId: ${userId}, uniqueString: ${uniqueString}`);

  UserVerification.findOne({ userId }) // Find the verification record
    .then((result) => {
      if (result) {
        logInfo("UserVerification record found:", result);
        const { expiresAt, uniqueString: hashedUniqueString } = result;

        if (expiresAt < Date.now()) {
          // If the link has expired
          logInfo("Verification link has expired");
          UserVerification.deleteOne({ userId }) // Delete the expired verification record
            .then(() => {
              User.deleteOne({ _id: userId }) // Delete the user
                .then(() => {
                  const message = "Link has expired. Please sign up again";
                  logInfo(message); // Log the message
                  res.redirect(`/user/verified?error=true&message=${message}`);
                })
                .catch((error) => {
                  logError(error);
                  const message =
                    "Clearing user with expired unique string failed.";
                  logInfo(message, error);
                  res.redirect(`/user/verified?error=true&message=${message}`);
                });
            })
            .catch((error) => {
              logError(error);
              const message =
                "Clearing expired user verification record failed.";
              logInfo(message, error);
              res.redirect(`/user/verified?error=true&message=${message}`);
            });
        } else {
          // If the link is still valid
          logInfo("Verification link is still valid");
          bcrypt
            .compare(uniqueString, hashedUniqueString) // Compare the unique strings
            .then((match) => {
              if (match) {
                // If they match
                logInfo("Unique strings match");
                User.updateOne({ _id: userId }, { verified: true }) // Update the user's verified status
                  .then(() => {
                    logInfo("User verification status updated successfully");
                    res.sendFile(resolvePath("views/verified.html"));
                  })
                  .catch((error) => {
                    logError(error);
                    const message =
                      "An error occurred while finalizing successful verification.";
                    logInfo(message, error);
                    res.redirect(
                      `/user/verified?error=true&message=${message}`,
                    );
                  });
              } else {
                // If the unique strings do not match
                const message =
                  "Invalid verification details passed. Check your inbox.";
                logInfo(message);
                res.redirect(`/user/verified?error=true&message=${message}`);
              }
            })
            .catch((error) => {
              logError(error);
              const message =
                "An error occurred while updating user record to show verified.";
              logInfo(message, error);
              res.redirect(`/user/verified?error=true&message=${message}`);
            });
        }
      } else {
        // If no verification record is found
        const message =
          "Account record doesn't exist or has been verified already. Please sign up or log in.";
        logInfo(message);
        res.redirect(`/user/verified?error=true&message=${message}`);
      }
    })
    .catch((error) => {
      logError(error);
      const message =
        "An error occurred while checking for existing user verification record";
      logInfo(message, error);
      res.redirect(`/user/verified?error=true&message=${message}`);
    });
};
