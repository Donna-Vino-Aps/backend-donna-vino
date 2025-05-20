import { verifyGoogleJWT } from "./google.js";
import { AccessToken } from "../../../models/index.js";

/**
 * Dynamically selects a verification method for an authentication provider.
 *
 * - If the provider is found in `providersVerificationMethodsMap`, its method is returned.
 * - Otherwise, it falls back to the default method using `AccessToken.fromJWT()`,
 *   which resolves the token from the database and verifies expiration.
 *
 * Note: The fallback ensures local tokens can be verified when no external provider is defined.
 */
export function selectProviderVerificationMethod(req) {
  const providerName = req.params.provider;
  const method = providersUserinfoMap[providerName];
  if (method) return method;

  // Fallback to internal access token verification (returns token from DB or null)
  return (token) => AccessToken.fromJWT(token);
}

export const providersVerificationMethodsMap = {
  google: verifyGoogleJWT,
};

export const providersUserinfoMap = {
  google: verifyGoogleJWT,
};
