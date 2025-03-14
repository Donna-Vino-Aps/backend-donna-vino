import { describe, it, expect, vi, beforeEach } from "vitest";
import Token from "../../../models/token/tokensModel.js";
import {
  saveTokenId,
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
} from "../../../services/token/tokenRepository.js";
import { logError, logInfo } from "../../../util/logging.js";

vi.mock("../../../models/token/tokensModel.js");

vi.mock("../../../util/logging.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

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
      expect(logInfo).toHaveBeenCalledWith("Token saved successfully");
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
      expect(logInfo).toHaveBeenCalledWith("Checking if the token is used");
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

    it("should handle errors gracefully when saving token", async () => {
      const error = new Error("DB Error");
      vi.spyOn(Token, "create").mockRejectedValue(error);

      const mockId = "someTokenId";

      await saveTokenId(mockId);

      expect(logError).toHaveBeenCalledWith("Error saving token:", error);
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
      expect(logInfo).toHaveBeenCalledWith("Token marked as used");
    });

    it("should log an error if update fails", async () => {
      const error = new Error("DB Error");
      Token.findOneAndUpdate.mockRejectedValue(error);

      await markTokenAsUsed(mockTokenId);

      expect(logError).toHaveBeenCalledWith(
        "Error marking token as used:",
        error,
      );
    });
  });

  describe("deleteToken", () => {
    it("should delete the token", async () => {
      Token.deleteOne.mockResolvedValue();

      await deleteToken(mockTokenId);

      expect(Token.deleteOne).toHaveBeenCalledWith({ id: mockTokenId });
      expect(logInfo).toHaveBeenCalledWith("Token deleted");
    });

    it("should log an error if deletion fails", async () => {
      const error = new Error("DB Error");
      Token.deleteOne.mockRejectedValue(error);

      await deleteToken(mockTokenId);

      expect(logError).toHaveBeenCalledWith("Error deleting token:", error);
    });
  });
});
