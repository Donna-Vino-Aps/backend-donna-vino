import jwt from "jsonwebtoken";
import { logInfo, logError } from "../util/logging.js";

export const requireAuth = (req, res, next) => {
  const session = req.cookies.session;

  if (!session || session.trim() === "") {
    logError("No session cookie found.");
    return res.status(401).send({
      success: false,
      msg: "BAD REQUEST: Authentication required.",
    });
  }

  logInfo("Verifying token from session cookie...");

  jwt.verify(session, process.env.JWT_SECRET, (err, data) => {
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
