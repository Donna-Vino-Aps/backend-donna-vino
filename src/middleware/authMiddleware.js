import jwt from "jsonwebtoken";
import { logError } from "../util/logging.js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export const requireAuth = (req, res, next) => {
  const session = req.cookies.session?.trim();
  const authHeader = req.headers["authorization"]?.trim();

  // If neither a session cookie nor an authorization header is provided, return 401
  if (!session && !authHeader) {
    logError("Authentication failed.");
    return res.status(401).send({
      success: false,
      msg: "BAD REQUEST: Authentication required.",
    });
  }

  const token =
    session ||
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded?.userId) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid or expired token." });
    }

    req.userId = decoded.userId;
    next();
  });
};
