// This module provides functions to generate and validate HMAC signatures
// for unsubscribe links to ensure they are secure and tamper-proof.

const crypto = require("crypto");

const HMAC_SECRET = process.env.HMAC_SECRET || "your-very-secret-key";

function generateUnsubscribeSignature(userId) {
  return crypto.createHmac("sha256", HMAC_SECRET).update(userId).digest("hex");
}

function isValidUnsubscribeSignature(userId, signature) {
  const expectedSig = generateUnsubscribeSignature(userId);
  return expectedSig === signature;
}

module.exports = {
  generateUnsubscribeSignature,
  isValidUnsubscribeSignature,
};
