import { selectProviderVerificationMethod } from "../auth/providers/index.js";
import { UserPre, User } from "../../models/index.js";
import { sendEmail } from "../../util/index.js";

/**
 * @description
 * Handles local sign-up via email and password.
 * This route is intended for use by users registering with credentials
 * (not via third-party OAuth providers).
 *
 * Workflow:
 * - Checks if the user already exists.
 * - If not, creates a temporary (pre-verified) user record.
 * - Sends an email with a verification link containing a token.
 *
 * @route POST /api/register
 * @access Public
 */

export async function signUp(req, res) {
  const { email, password, firstName, lastName, dateOfBirth, isSubscribed } =
    req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const user = await UserPre.create({
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    isSubscribed,
    authProvider: "local",
  });
  const emailVerificationToken = await user.issueEmailVerificationToken();

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const params = {
    email: email,
    token: emailVerificationToken,
    baseUrl: baseUrl,
    name: user.firstName,
  };
  await sendEmail(email, "Sign up", "emailConfirmation", params);
  return res.status(201).json({ message: "Pre-Sign up successfully" });
}

/**
 * @description
 * Handles sign-up or sign-in via external OAuth providers (e.g., Google).
 * This route accepts a provider-issued token and verifies it using the appropriate method.
 *
 * Workflow:
 * - Verifies the token using the selected provider logic.
 * - If the user doesn't exist, creates a temporary user record.
 * - Issues access and refresh tokens upon successful verification.
 *
 * @route POST /api/register/provider
 * @access Public
 */
export async function providerSignUp(req, res) {
  const token = req.body.token;
  const authVerificationMethod = selectProviderVerificationMethod(req);

  const data = await authVerificationMethod(token);

  if (!data) return res.status(401).json({ message: "Authentication failed" });

  if (!data.email && !data.userId) {
    return res.status(401).json({ message: "Invalid user info" });
  }

  let user = await User.findOne({ email: data.email });
  if (!user) {
    // TODO: make as a separate function for provider specific user creation data processing when something other than Google added
    user = await User.create({
      email: data.email,
      firstName: data.given_name || "User",
      lastName: data.family_name || "",
      isSubscribed: false,
      authProvider: "google",
      picture: data.picture || null,
    });
  }

  const tokens = await user.issueAccessTokens();
  // HTTP 201: Session created (token pair issued)
  return res.status(201).json(tokens);
}
