// tests/token/tokenRepository.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import Token from "../../../models/token/tokensModel.js";
import {
  saveTokenId,
  isTokenUsed,
  markTokenAsUsed,
} from "../../../services/token/tokenRepository";
import { logError } from "../../util/logging.js";

vi.mock("../../../models/token/tokensModel.js");
vi.mock("../../../util/logging.js");

describe("Token Repository", () => {
  const mockTokenId = "mock-token-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveTokenId", () => {
    it("should save a token successfully", async () => {
      Token.create.mockResolvedValue();
      await saveTokenId(mockTokenId);

      expect(Token.create).toHaveBeenCalledWith({ id: mockTokenId });
    });

    it("should log an error if saving fails", async () => {
      const error = new Error("DB Error");
      Token.create.mockRejectedValue(error);

      await saveTokenId(mockTokenId);

      expect(logError).toHaveBeenCalledWith("Error saving token:", error);
    });
  });

  describe("isTokenUsed", () => {
    it("should return false if token is not used", async () => {
      Token.findOne.mockResolvedValue({ id: mockTokenId, used: false });

      const result = await isTokenUsed(mockTokenId);
      expect(result).toBe(false);
    });

    it("should return true if token is used", async () => {
      Token.findOne.mockResolvedValue({ id: mockTokenId, used: true });

      const result = await isTokenUsed(mockTokenId);
      expect(result).toBe(true);
    });

    it("should return true if token does not exist", async () => {
      Token.findOne.mockResolvedValue(null);

      const result = await isTokenUsed(mockTokenId);
      expect(result).toBe(true);
    });
  });

  describe("markTokenAsUsed", () => {
    it("should update the token as used", async () => {
      Token.findOneAndUpdate.mockResolvedValue();

      await markTokenAsUsed(mockTokenId);

      expect(Token.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockTokenId },
        { used: true },
      );
    });
  });
});
