import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import User from "../../models/userModels.js";
import { logError, logInfo } from "../../util/logging.js";
import { sendWelcomeEmail } from "./emailWelcomeController.js";
import { autoCreateDefaultCategories } from "../../util/autoCreateDefaultCategories.js";

// OAuth2 clients for different platforms
const clients = {
  Web: new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB),
  iOS: new OAuth2Client(process.env.GOOGLE_CLIENT_ID_IOS),
  Android: new OAuth2Client(process.env.GOOGLE_CLIENT_ID_ANDROID),
  Expo: new OAuth2Client(process.env.GOOGLE_CLIENT_ID_EXPO),
};

export const signInWithGoogleController = async (req, res) => {
  const { token, platform } = req.body;

  const client = clients[platform];
  if (!client) {
    logError(`Invalid platform specified: ${platform}`);
    return res.status(400).json({ error: `Invalid platform: ${platform}` });
  }

  // Special handling for the web platform
  if (platform === "Web") {
    if (!token) {
      // If no token is provided, retrieve user details from request body
      try {
        const { email, name, picture } = req.body;
        let user = await User.findOne({ email });

        if (!user) {
          // Create a new user if it does not exist
          const password = await bcrypt.hash("defaultPassword", 10);
          user = new User({ name, email, picture, password });
          await user.save();

          // Send a welcome email after user creation
          sendWelcomeEmail(user).catch((error) => {
            logError("Error sending welcome email: " + error.message);
          });

          logInfo(`New Web user created: ${user.email}`);
        }

        // Generate JWT token
        const jwtToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "72h",
          },
        );

        // Set the session cookie
        res.cookie("session", jwtToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 86400000,
        });

        // Auto-create default categories for the user
        try {
          await autoCreateDefaultCategories(user._id);
        } catch (categoryError) {
          logError(
            `Failed to create categories for new user: ${categoryError.message}`,
          );
          return res.status(201).json({
            success: true,
            msg: "User signed in, but default categories could not be created.",
          });
        }

        const responseData = {
          success: true,
          msg: "User signed in successfully",
          token: jwtToken,
          user: {
            name: user.name,
            email: user.email,
            picture: user.picture,
          },
        };
        return res.status(201).json(responseData); // Return 201 for user creation
      } catch (error) {
        logError("Error during Web sign-in process: " + error.message);
        return res
          .status(500)
          .json({ error: "Error signing in with Google for Web" });
      }
    } else {
      // If token is provided, verify it
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const newJwtToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "72h" },
        );

        res.cookie("session", newJwtToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 86400000,
        });

        const responseData = {
          success: true,
          msg: "User is already signed in",
          user: {
            name: user.name,
            email: user.email,
            picture: user.picture,
          },
        };
        logInfo(`SignIn response: ${JSON.stringify(responseData)}`);
        return res.status(200).json(responseData); // Return 200 for successful sign-in
      } catch (error) {
        logError("Error verifying token for Web sign-in: " + error.message);
        return res.status(401).json({ error: "Invalid token" });
      }
    }
  }

  // Handling for mobile platforms (iOS, Android, Expo)
  if (!token) {
    logError("Google idToken missing for mobile platform");
    return res.status(400).json({ error: "idToken from Google is missing." });
  }

  try {
    // Verify the ID token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env[`GOOGLE_CLIENT_ID_${platform.toUpperCase()}`],
    });

    const { name, email, picture } = ticket.getPayload();
    let user = await User.findOne({ email });

    // Check if user already exists or create a new user
    if (!user) {
      // Create a new user if not found
      user = new User({ name, email, picture });
      await user.save();
      await sendWelcomeEmail(user); // Send a welcome email

      logInfo(`New mobile user created: ${user.email}`);

      // Generate JWT token for new user
      const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "72h",
      });
      res.cookie("session", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400000,
      });

      // Auto-create default categories for the user
      try {
        await autoCreateDefaultCategories(user._id);
      } catch (categoryError) {
        logError(`Failed to create categories: ${categoryError.message}`);
        return res.status(201).json({
          success: true,
          msg: "User signed in, but default categories could not be created. In mobile Platform.",
        });
      }
      const responseData = {
        success: true,
        msg: "User created and signed in successfully. In mobil platform.",
        token: jwtToken,
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      };
      return res.status(201).json(responseData); // Return 201 for user creation
    } else {
      // If user already exists, generate the JWT and respond
      const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "72h",
      });
      res.cookie("session", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400000,
      });

      const responseData = {
        success: true,
        msg: "User created and signed in successfully. In mobil platform.",
        token: jwtToken,
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      };
      return res.status(200).json(responseData); // Return 200 for existing user sign-in
    }
  } catch (error) {
    logError("Sign-in error: " + error.message);
    return res.status(500).json({ error: "Error during sign-in process" });
  }
};
