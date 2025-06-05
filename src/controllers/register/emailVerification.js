import { User, UserPre, EmailVerificationToken } from "../../models/index.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../util/index.js";
import { baseDonnaVinoEcommerceWebUrl } from "../../config/environment.js";

/**
 * Handles the email confirmation flow.
 * This endpoint is triggered when a user clicks the verification link sent to their email.
 *
 * Steps:
 * - Validates the token using EmailVerificationToken.fromJWT()
 * - If invalid or expired, redirects to `/signUp/error`
 * - Looks up the pre-user (`UserPre`) using the email
 * - Converts the pre-user to a full user (`User`) by cloning data and removing:
 *   - `_id`, `__v`, `__t`, and TTL field (`expiresAt`)
 * - Creates the permanent user entry in the database
 * - Issues access and refresh tokens
 * - Redirects to `/signUp/verification-completed` on the frontend, passing tokens as URL parameters
 *
 */
export async function confirm(req, res) {
  const email = req.query.email;
  const token = req.query.token;
  const frontedUrl = baseDonnaVinoEcommerceWebUrl;
  const errorPageUrl = `${frontedUrl}/signup/verification-failed`;

  const emailToken = await EmailVerificationToken.fromJWT(token);
  if (!emailToken) {
    return res.redirect(errorPageUrl);
  }

  const decoded = jwt.decode(token);
  if (decoded.email !== email) {
    return res.redirect(errorPageUrl);
  }

  const preUser = await UserPre.findOne({ email });
  if (!preUser) {
    return res.redirect(errorPageUrl);
  }

  const userData = preUser.toObject();
  await UserPre.findByIdAndDelete(userData._id);

  // Clean internal/discriminator-related fields
  delete userData._id;
  delete userData.__v;
  delete userData.__t;
  delete userData.expiresAt;

  const user = await User.create(userData);
  await emailToken.revoke();
  const tokens = await user.issueAccessTokens();

  const welcomeParams = {
    name: user.firstName,
    email: user.email,
    baseUrl: frontedUrl,
  };

  await sendEmail(
    user.email,
    "Welcome to Donna Vino!",
    "emailWelcome",
    welcomeParams,
  );

  const url = new URL("/signup/verification-completed", frontedUrl);
  url.searchParams.set("accessToken", tokens.accessToken);
  url.searchParams.set("refreshToken", tokens.refreshToken);

  return res.redirect(url.toString());
}

/**
 * Cancels the user sign-up process after receiving a valid decline token.
 * Triggered when a user clicks the "cancel registration" link from their email.
 *
 * Steps:
 * - Validates the token using EmailVerificationToken.fromJWT()
 * - If invalid or expired, redirects to `/signUp/error`
 * - Deletes the token record (optional: you could also delete the `UserPre` record here)
 * - Redirects to `/signUp/canceled` on the frontend
 *
 */
export async function decline(req, res) {
  const email = req.query.email;
  const token = req.query.token;

  const emailToken = await EmailVerificationToken.fromJWT(token);
  if (!emailToken) {
    return res.redirect(errorPageUrl);
  }

  const decoded = jwt.decode(token);
  if (decoded.email !== email) {
    return res.redirect(errorPageUrl);
  }

  await emailToken.revoke();

  return res.redirect(`${process.env.FRONTEND_URI}/signUp/canceled`);
}

/**
 * Placeholder for changing the user's email during pre-signup or verification.
 * Implementation TBD.
 */
export async function changeEmail(_req, _res) {
  // To be implemented: update pre-user email + reissue verification token
}
