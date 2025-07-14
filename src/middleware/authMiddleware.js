import protectedAPIs from "../config/protectedAPIs.js";
import { AccessToken } from "../models/index.js";
import { logError, logInfo } from "../util/logging.js";

/**
 * Checks whether a given request path is protected.
 * It compares the path against the protectedAPIs list,
 * which can contain strings (for prefix matching) or RegExps (for pattern matching).
 *
 * @param {string} path - The request path (e.g., "/api/user/123")
 * @returns {boolean} True if the path requires authentication
 */
const checkIfProtected = (path) =>
  protectedAPIs.some((rule) => {
    if (typeof rule === "string") {
      return path.startsWith(rule);
    } else if (rule instanceof RegExp) {
      return rule.test(path);
    }
    return false;
  });

/**
 * Sends a 401 Unauthorized response with a consistent error format.
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error message to send
 */
export const sendUnauthorized = (res, message = "Access denied.") => {
  return res.status(401).json({ error: message });
};

/**
 * Express middleware to enforce authentication on protected routes.
 *
 * For any route matched by `protectedAPIs`, this middleware expects a valid
 * Bearer token in the `Authorization` header. The token is verified using
 * `AccessToken.fromJWT`, which checks the token’s validity and existence in the database.
 *
 * If verification succeeds, the decoded token is attached to `req.accessToken`.
 * Otherwise, a 401 Unauthorized response is returned.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Callback to pass control to next middleware
 */
export const authMiddleware = async (req, res, next) => {
  const path = req.originalUrl;
  logInfo("Auth middleware triggered for path:", path);

  const isProtected = checkIfProtected(path);

  // If the path is not protected, skip authentication
  if (!isProtected) {
    return next();
  }

  // Get the "Authorization" header (e.g., "Bearer <token>")
  const authorization = req.headers["authorization"];
  if (!authorization) {
    return sendUnauthorized(res, "Authentication required.");
  }

  // Extract the token part from the "Bearer <token>" format
  const tokenString = authorization.split(" ")[1];
  if (!tokenString) {
    return sendUnauthorized(res, "Access denied. Invalid token.");
  }

  try {
    // Verify the token and check if it exists in the DB (not revoked)
    const token = await AccessToken.fromJWT(tokenString);
    if (!token) {
      return sendUnauthorized(res, "Access denied. Invalid token.");
    }

    // Attach the valid token to the request for downstream use
    req.accessToken = token;

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    logError(`Token verification error: ${err}`);
    return sendUnauthorized(res, "Access denied. Invalid or expired token.");
  }
};
