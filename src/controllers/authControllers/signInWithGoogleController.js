import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../../models/userModels.js";
import { logError, logInfo } from "../../util/logging.js";
import { sendWelcomeEmail } from "./emailWelcomeController.js";

// OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAndSetSession = (res, user) => {
  const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "72h",
  });

  res.cookie("session", jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400000, // 24 hr
  });

  return jwtToken;
};

export const signInWithGoogleController = async (req, res) => {
  try {
    const sessionToken = req.cookies?.session;

    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
          logInfo(`User already signed in: ${user.email}`);
          return res.status(200).json({
            success: true,
            msg: "User is already signed in",
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              picture: user.picture,
            },
          });
        }
      } catch (sessionError) {
        logError("Invalid session token: " + sessionError.message);
      }
    }

    // Extract fields from the request body.
    // For Google sign-in, id_token is expected, but we handle the fallback as Google as well.
    const { id_token, email, name, picture } = req.body;

    let user;
    if (!id_token) {
      // Fallback branch: if no id_token is provided,
      // we assume it's a Google sign-in with the necessary fields.
      if (!email || !name || !picture) {
        return res.status(401).json({ error: "Missing user data" });
      }

      // Extract firstName and lastName from the provided full name.
      const names = name.trim().split(" ");
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(" ") : "Unknown";

      user = await User.findOne({ email });
      if (!user) {
        user = new User({
          firstName,
          lastName,
          email,
          picture,
          authProvider: "google" // Using google as auth provider.
        });
        await user.save();

        sendWelcomeEmail(user).catch((error) =>
          logError("Error sending welcome email: " + error.message),
        );

        logInfo(`New Google user created (fallback): ${user.email}`);
      }
    } else {
      // Verify id_token using Google OAuth2Client.
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      // Extract firstName and lastName from Google payload.
      const names = payload.name ? payload.name.trim().split(" ") : [];
      const firstName = names.length > 0 ? names[0] : "Unknown";
      const lastName = names.length > 1 ? names.slice(1).join(" ") : "Unknown";

      user = await User.findOne({ email: payload.email });
      if (!user) {
        user = new User({
          firstName,
          lastName,
          email: payload.email,
          picture: payload.picture,
          authProvider: "google",
        });
        await user.save();

        sendWelcomeEmail(user).catch((error) =>
          logError("Error sending welcome email: " + error.message),
        );

        logInfo(`New Google user created: ${user.email}`);
      }
    }

    const jwtToken = generateAndSetSession(res, user);

    return res.status(200).json({
      success: true,
      msg: "User signed in successfully",
      token: jwtToken,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    logError("Error during sign-in process: " + error.message);
    return res.status(500).json({ error: "Error signing in with Google" });
  }
};
