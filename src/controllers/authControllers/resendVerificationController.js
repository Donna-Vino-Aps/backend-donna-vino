// import { logError, logInfo } from "../../util/logging.js";
// import PendingUser from "../../models/users/pendingUserModel.js";
// import { sendVerificationEmail } from "../../services/email/verificationEmailService.js";
//
// export const resendVerificationEmail = async (req, res) => {
//   const { email } = req.query;
//
//   if (!email) {
//     logError("Missing email in resend verification request");
//     return res.status(400).json({
//       success: false,
//       msg: "Email is required to resend verification",
//     });
//   }
//
//   const normalizedEmail = email.toLowerCase();
//
//   // Find pending user by email
//   let pendingUser;
//   try {
//     pendingUser = await PendingUser.findOne({ email: normalizedEmail });
//
//     if (!pendingUser) {
//       logError(
//         `No pending user found for email: ${normalizedEmail} when trying to resend verification`,
//       );
//       return res.status(404).json({
//         success: false,
//         msg: "No pending registration found for this email. Please sign up first.",
//       });
//     }
//   } catch (dbError) {
//     logError(
//       `Database error finding pending user for resend: ${dbError.message}`,
//     );
//     return res.status(500).json({
//       success: false,
//       msg: "Unable to process your request. Please try again later.",
//     });
//   }
//
//   // Generate new verification token and send email using the service
//   try {
//     await sendVerificationEmail(pendingUser);
//     logInfo(`New verification email sent to ${pendingUser.email}`);
//
//     return res.status(200).json({
//       success: true,
//       msg: "Verification email resent. Please check your inbox to complete the signup process.",
//       pendingUser: {
//         email: pendingUser.email,
//         firstName: pendingUser.firstName,
//         lastName: pendingUser.lastName,
//       },
//     });
//   } catch (error) {
//     logError(`Error sending resend verification email: ${error.message}`);
//     return res.status(500).json({
//       success: false,
//       msg: "Unable to send verification email. Please try again later.",
//     });
//   }
// };
