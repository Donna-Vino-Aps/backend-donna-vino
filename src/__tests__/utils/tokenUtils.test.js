import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { describe, it, beforeEach, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "../../util/tokenUtils.js";

describe("generateToken", () => {
  it("should generate a valid token with an email", () => {
    const email = "test@example.com";
    const token = generateToken(email);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Decode the token using the correct secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded).toHaveProperty("email", email);
    expect(decoded).toHaveProperty("exp");
  });

  it("should generate a token that expires in 6 hours", () => {
    const email = "test@example.com";
    const token = generateToken(email);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresInSeconds = 6 * 60 * 60;

    const timeDiff = decoded.exp - Math.floor(Date.now() / 1000);
    expect(timeDiff).toBeLessThanOrEqual(expiresInSeconds);
  });
});
