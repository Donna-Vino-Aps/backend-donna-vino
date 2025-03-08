import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "../../../services/token/tokenGenerator";
import * as tokenRepository from "../../../services/token/tokenRepository";

vi.mock("jsonwebtoken");
vi.mock("../../../services/token/tokenRepository");

describe("generateToken", () => {
  const mockEmail = "user@example.com";

  it("should generate a valid JWT token", async () => {
    const mockToken = "mocked.jwt.token";
    jwt.sign.mockReturnValue(mockToken);
    tokenRepository.saveTokenId.mockResolvedValue();

    const token = await generateToken(mockEmail);

    expect(token).toBe(mockToken);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ email: mockEmail }),
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    expect(tokenRepository.saveTokenId).toHaveBeenCalled();
  });

  it("should call saveTokenId with a UUID", async () => {
    jwt.sign.mockReturnValue("mocked.jwt.token");
    tokenRepository.saveTokenId.mockResolvedValue();

    await generateToken(mockEmail);

    const payload = jwt.sign.mock.calls[0][0];
    expect(payload).toHaveProperty("id");
    expect(payload.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
