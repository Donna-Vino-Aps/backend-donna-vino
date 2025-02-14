import jwt from "jsonwebtoken";
import { logInfo, logError } from "../util/logging.js";

export const requireAuth = (req, res, next) => {
  const session = req.cookies.session;
  const authHeader = req.headers["authorization"];
  let token;

  // If neither a session cookie nor an authorization header is provided, return 401
  if (
    (!session || session.trim() === "") &&
    (!authHeader || authHeader.trim() === "")
  ) {
    logError("No session cookie found.");
    return res.status(401).send({
      success: false,
      msg: "BAD REQUEST: Authentication required.",
    });
  }

  // Use the session cookie if available; otherwise, extract the token from the Authorization header
  if (session && session.trim() !== "") {
    token = session;
    logInfo("Verifying token from session cookie.");
  } else if (authHeader && authHeader.trim() !== "") {
    token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;
    logInfo("Verifying token from Authorization header.");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
    if (err) {
      logError("Error verifying token:", err);
      return res.status(401).send({
        success: false,
        msg: "BAD REQUEST: Authentication failed.",
      });
    }

    if (!data.userId) {
      logError("User not found in token data.");
      return res.status(401).send({
        success: false,
        msg: "BAD REQUEST: Authentication failed.",
      });
    }

    req.userId = data.userId;
    next();
  });
};
