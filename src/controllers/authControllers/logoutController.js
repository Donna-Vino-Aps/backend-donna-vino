import { logInfo, logError } from "../../util/logging.js";

export const logout = (req, res) => {
  try {
    //Verify if there is an active sesion cookie or token
    if (!req.cookies.session && !req.headers["authorization"]) {
      return res.status(400).json({
        success: false,
        message: " No active session or token to logout from",
      });
    }
    //Clean session cookies is there is some
    if (req.cookies.session) {
      res.clearCookie("session", { httpOnly: true, secure: true });
      res.clearCookie("zenTimerToken", { httpOnly: true, secure: true });
    }

    if (req.headers["authorization"]) {
      logInfo("Token log-out executed.");
    }

    logInfo("User succefully logged out");

    return res.status(200).json({
      success: true,
      message: "User succesfully logged out",
    });
  } catch (error) {
    logError("Logout error: ", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during logout",
    });
  }
};
