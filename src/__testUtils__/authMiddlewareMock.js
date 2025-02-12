import { logInfo, logError } from "../util/logging";

export const requireAuthMock = (req, res, next) => {
  const session = req.cookies.session;

  const simulatedVariables = {
    cookies: {
      session: "validToken",
    },
  };

  const validUserId = {
    data: {
      userId: 1234567890,
    },
  };

  if (session !== simulatedVariables.cookies.session) {
    logError("Session cookie not found or invalid.");
    return res.status(403).send({ error: "Authentication required." });
  }

  req.userId = validUserId.data.userId;
  logInfo("User authenticated successfully.");
  next();
};
