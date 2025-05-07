import jwt from "jsonwebtoken";
import { logInfo, logError } from "../util/logging.js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export const requireAuth = (req, res, next) => {
  const session = req.cookies.session?.trim();
  const authHeader = req.headers["authorization"]?.trim();
  let token;

  // If neither a session cookie nor an authorization header is provided, return 401
  if (!session && !authHeader) {
    logError("No session cookie (or authorization header) found.");
    return res.status(401).send({
      success: false,
      msg: "BAD REQUEST: Authentication required.",
    });
  }

  // Use the session cookie if available; otherwise, extract the token from the Authorization header
  if (session) {
    token = session;
    logInfo("Verifying token from session cookie.");
  } else if (authHeader) {
    token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;
    logInfo("Verifying token from Authorization header.");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
    if (err) {
      logError("Error verifying token:", err);
      return res.status(401).json({
        success: false,
        msg: "Unauthorized: Invalid or expired token.",
      });
    }

    if (!data.userId) {
      logError("JWT decoded but missing expected userId property:", data);
      return res.status(401).json({
        success: false,
        msg: "Unauthorized: Invalid or expired token.",
      });
    }

    req.userId = data.userId;
    next();
  });
};
