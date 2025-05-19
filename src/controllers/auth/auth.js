import { providersUserinfoMap } from "./providers/index.js";
import { AccessToken, RefreshToken, User } from "../../models/index.js";

/**
 * Dynamically selects a verification method for an authentication provider.
 *
 * - If the provider is found in `providersVerificationMethodsMap`, its method is returned.
 * - Otherwise, it falls back to the default method using `AccessToken.fromJWT()`,
 *   which resolves the token from the database and verifies expiration.
 *
 * Note: The fallback ensures local tokens can be verified when no external provider is defined.
 */
function selectProviderVerificationMethod(req) {
  const providerName = req.params.provider;
  const method = providersUserinfoMap[providerName];
  if (method) return method;

  // Fallback to internal access token verification (returns token from DB or null)
  return (token) => AccessToken.fromJWT(token);
}

/**
 * Handles login using local credentials (email + password).
 *
 * - Issues a fresh access + refresh token pair if successful.
 * - Returns HTTP 201 (Created) upon success, or 401 (Unauthorized) if credentials are invalid.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  console.log("LOGIN REQUEST:", { email, password });

  const user = await User.findOne({ email });
  console.log("USER FOUND:", user);

  if (!user) {
    console.log("NO USER FOUND!");
    return res.status(401).json({ message: "Authentication failed" });
  }

  const passwordValid = await user.verifyPassword(password);
  console.log("PASSWORD VALID:", passwordValid);

  if (!passwordValid) {
    console.log("INVALID PASSWORD!");
    return res.status(401).json({ message: "Authentication failed" });
  }

  const tokens = await user.issueAccessTokens();
  return res.status(201).json(tokens);
}

/**
 * Handles authentication via third-party providers (e.g., Google).
 *
 * - Selects a provider-specific verification strategy (or falls back to JWT).
 * - Extracts user info from the verified payload (email or userId).
 * - If user exists, returns a new access + refresh token pair.
 */
export async function providerLogin(req, res) {
  const token = req.body.token;
  const authVerificationMethod = selectProviderVerificationMethod(req);

  const data = await authVerificationMethod(token);

  if (!data) return res.status(401).json({ message: "Authentication failed" });

  if (!data.email && !data.userId) {
    return res.status(401).json({ message: "Invalid user info" });
  }

  // Lookup user by email or ID
  const user = data.email
    ? await User.findOne({ email: data.email })
    : await User.findById(data.userId);

  if (!user) return res.status(401).json({ message: "Authentication failed" });

  const tokens = await user.issueAccessTokens();
  return res.status(201).json(tokens);
}

/**
 * Handles token renewal using an existing access and refresh token.
 *
 * - Verifies both tokens using `.fromJWT()` and issues a new access token.
 * - Returns HTTP 201 with the new access token or 401 if verification fails.
 */
export async function refresh(req, res) {
  const accessTokenString = req.body.accessToken;
  const refreshTokenString = req.body.refreshToken;

  if (!accessTokenString || !refreshTokenString) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  const refreshToken = await RefreshToken.fromJWT(refreshTokenString);
  if (!refreshToken) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  const newAccessToken = await refreshToken.issueNewAccessToken(
    accessTokenString,
  );
  if (!newAccessToken) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  return res.status(201).json({ accessToken: newAccessToken.token });
}

/**
 * Revokes both access and corresponding refresh tokens.
 *
 * Token is resolved from (in priority order):
 * 1. Authorization header (Bearer)
 * 2. Request body: `accessToken` or `token`
 *
 * If valid tokens are found in the DB, they are deleted.
 */
export async function revoke(req, res) {
  let token;

  // Priority 1: Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Priority 2: Request body
  if (!token) {
    token = req.body.accessToken || req.body.token;
  }

  if (!token) {
    return res.status(400).json({ error: "Access token is missing" });
  }

  const accessToken = await AccessToken.fromJWT(token);
  const refreshToken = await RefreshToken.findOne({ accessToken });

  if (accessToken) await accessToken.revoke();
  if (refreshToken) await refreshToken.revoke();

  // HTTP 204: No content, successful revocation
  return res.status(204).send();
}

/**
 * Token extension endpoint (not implemented in this demo).
 *
 * Intended to refresh a token pair before either one expires,
 * allowing session continuation without re-authentication.
 */
export async function extend(req, res) {
  return res.status(404).json({ message: "Not yet implemented!" });
}

/**
 * Verifies if an access token is valid and recognized by the system.
 *
 * Token is resolved in priority order:
 * 1. Authorization header (Bearer <token>)
 * 2. Query parameter `?token=<token>`
 *
 * If the token is missing, invalid, or expired, a 401 is returned.
 * Otherwise, a 200 response confirms the token is valid.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>}
 */
export async function verify(req, res) {
  let token;

  // Priority 1: Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Priority 2: Query parameter ?token=...
  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Access token not provided" });
  }

  const accessToken = await AccessToken.fromJWT(token);

  if (!accessToken) {
    return res
      .status(401)
      .json({ message: "Access token is invalid or expired" });
  }

  return res.status(200).json({ message: "Access token is valid" });
}
