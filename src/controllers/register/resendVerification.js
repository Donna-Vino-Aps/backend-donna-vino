import { UserPre, EmailVerificationToken } from "../../models/index.js";
import { sendEmail } from "../../util/index.js";
import { logError } from "../../util/logging.js";

export async function resendVerificationEmail(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  try {
    const user = await UserPre.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with this email exists, a new verification link has been sent.",
      });
    }

    await EmailVerificationToken.deleteMany({ user: user._id });

    const emailVerificationToken = await user.issueEmailVerificationToken();

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const params = {
      email: email,
      token: emailVerificationToken,
      baseUrl: baseUrl,
      name: user.firstName,
    };
    await sendEmail(
      email,
      "Verify your email address for Donna Vino",
      "emailConfirmation",
      params,
    );

    return res.status(200).json({
      success: true,
      message: "A new verification link has been sent to your email address.",
    });
  } catch (error) {
    logError(error, "Error resending verification email");
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
}
