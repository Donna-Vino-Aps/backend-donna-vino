import { logInfo, logError } from "../util/logging.js";

export const requireAuthMock = (req, res, next) => {
  const session = req.cookies.session;

  logInfo("Verifying request in authMiddlewareMock file...");

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
    const errorMessage = "Session cookie not found or invalid.";
    // logError(errorMessage);
    return res.status(403).send({ error: errorMessage });
  }

  if (!req.data.userId || req.data.userId === "") {
    const errorMessage = "Authenticated user does not exist.";
    // logError(errorMessage);
    return res.status(403).send({ error: errorMessage });
  }

  if (req.data.userId !== validUserId.data.userId) {
    const errorMessage = "Authenticated user does not match valid user.";
    // logError(errorMessage);
    return res.status(403).send({ error: errorMessage });
  }

  const successMessage = `User authenticated successfully. User ID: ${validUserId.data.userId}`;
  logInfo(successMessage);
  next();
};
