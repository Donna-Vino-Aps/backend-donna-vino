import { logInfo, logError } from "../../util/logging.js";

export const logout = (req, res) => {
  try {
    //Verify if there is an active sesion cookie or token
    if (!req.cookies.session && !req.headers["authorization"]) {
      return res.status(401).json({
        success: false,
        msg: "BAD REQUEST: Authentication required.",
      });
    }
    //Clean session cookies if there is some
    if (req.cookies.session) {
      res.clearCookie("session", { httpOnly: true, secure: true });
      res.clearCookie("zenTimerToken", { httpOnly: true, secure: true });
    }

    if (req.headers["authorization"]) {
      logInfo("Token logout executed.");
    }

    logInfo("User successfully logged out");

    return res.status(200).json({
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
