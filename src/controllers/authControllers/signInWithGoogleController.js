import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import User from "../../models/userModels.js";
import { logError, logInfo } from "../../util/logging.js";
import { sendWelcomeEmail } from "./emailWelcomeController.js";

// OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);

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
              name: user.name,
              email: user.email,
              picture: user.picture,
            },
          });
        }
      } catch (sessionError) {
        logError("Invalid session token: " + sessionError.message);
      }
    }

    // CHANGE: Use id_token (JWT) instead of token.
    // This is the token returned by Google when "openid" scope is requested.
    const { id_token, email, name, picture } = req.body;

    let user;
    if (!id_token) {
      // CHANGE: Check for id_token here instead of token
      if (!email || !name || !picture) {
        return res.status(401).json({ error: "Missing user data" });
      }

      user = await User.findOne({ email });

      if (!user) {
        const password = await bcrypt.hash("defaultPassword", 10);
        user = new User({ name, email, picture, password });
        await user.save();

        sendWelcomeEmail(user).catch((error) =>
          logError("Error sending welcome email: " + error.message),
        );

        logInfo(`New Web user created: ${user.email}`);
      }
    } else {
      // CHANGE: Use id_token in verifyIdToken
      const ticket = await client.verifyIdToken({
        idToken: id_token, // CHANGE: Using id_token here
        audience: process.env.GOOGLE_CLIENT_ID_WEB,
      });

      const payload = ticket.getPayload();
      user = await User.findOne({ email: payload.email });

      if (!user) {
        user = new User({
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
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
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    logError("Error during sign-in process: " + error.message);
    return res.status(500).json({ error: "Error signing in with Google" });
  }
};
