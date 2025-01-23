import jwt from "jsonwebtoken";
import { logInfo, logError } from "../util/logging.js";

export const requireAuth = (req, res, next) => {
  // Retrieve the session cookie and Authorization header from the request
  const session = req.cookies.session;
  const authHeader = req.headers.authorization;

  logInfo("Verifying token in session cookie or Authorization header...");

  // Helper function to verify the token and authenticate the user
  const verifyToken = (token) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
      if (err) {
        // Log and respond with 401 if token verification fails
        const errorMessage = "Error verifying token:";
        logError(errorMessage, err);
        return res.status(401).send({
          success: false,
          msg: "BAD REQUEST: Authentication failed.",
        });
      }

      // Check if userId exists in the token payload
      if (!data.userId) {
        const errorMessage = "User not found in token data.";
        logError(errorMessage);
        return res.status(401).send({
          success: false,
          msg: "BAD REQUEST: Authentication failed.",
        });
      }

      // Attach userId to the request and proceed to next middleware/route handler
      req.userId = data.userId;
      next();
    });
  };

  // 1. First, check if the session cookie is present and not empty
  if (session && session.trim() !== "") {
    verifyToken(session); // If valid, verifies session token and continues
  }

  // 2. If no session cookie, check the Authorization header for a token
  else if (authHeader && authHeader.startsWith("Bearer ")) {
    // Extract the token from the Authorization header
    const token = authHeader.split(" ")[1];
    verifyToken(token); // Verify the token from the Authorization header
  }
  // 3. If neither a valid session cookie nor Authorization header is found, respond with 401
  else {
    logError("No session cookie or authorization token found.");
    return res.status(401).send({
      success: false,
      msg: "BAD REQUEST: Authentication required.",
    });
  }
};
