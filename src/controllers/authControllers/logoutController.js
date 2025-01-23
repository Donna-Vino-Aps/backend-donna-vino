import { logInfo, logError } from "../../util/logging.js";

export const logout = (req, res) => {
  try {
    // Check if cookies exist and log them, otherwise log the token if available
    if (Object.keys(req.cookies).length > 0) {
      logInfo("Current cookies:", req.cookies);
    } else if (req.headers["authorization"]) {
      logInfo(
        "No cookies found, but found token:",
        req.headers["authorization"],
      );
    } else {
      logInfo("No cookies or token found.");
    }

    // Check for active session (either cookie or token)
    if (!req.cookies.session && !req.headers["authorization"]) {
      return res.status(400).json({
        success: false,
        message: "No active session or token to log out from.",
      });
    }

    // Clear cookies for mobile users
    if (req.cookies.session) {
      res.clearCookie("session", { httpOnly: true, secure: true });
      res.clearCookie("zenTimerToken", { httpOnly: true, secure: true });
    }

    if (req.headers["authorization"]) {
      // Here you could implement any logic related to invalidating the token if necessary
      // For example: invalidateToken(req.headers['authorization']);
      logInfo("User is logged out via token");
    }

    // Log the user logout
    logInfo(`User with ID ${req.userId} successfully logged out.`);

    res.status(200).json({
      success: true,
      message: "User successfully logged out",
    });
  } catch (error) {
    logError("Logout error: ", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during logout",
    });
  }
};
