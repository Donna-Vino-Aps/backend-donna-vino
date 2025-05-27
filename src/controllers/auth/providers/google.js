import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies the authenticity of a Google-issued ID token (JWT).
 *
 * Uses Google's OAuth2Client to validate:
 * - Signature
 * - Audience (client ID)
 * - Issuer
 *
 * @param {string} token - The Google ID token to verify
 * @returns {Promise<Object|null>} The decoded payload (sub, email, etc.) or null if invalid
 */
export async function verifyGoogleJWT(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload || null;
  } catch (err) {
    return null;
  }
}
