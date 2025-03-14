import Token from "../../models/token/tokensModel.js";
import { logError, logInfo } from "../../util/logging.js";

export const saveTokenId = async (id) => {
  try {
    await Token.create({ id });
    logInfo("Token saved successfully");
  } catch (error) {
    logError("Error saving token:", error);
  }
};

export const isTokenUsed = async (id) => {
  const token = await Token.findOne({ id });
  logInfo("Checking if the token is used");
  return token?.used || !token;
};

export const markTokenAsUsed = async (id) => {
  try {
    await Token.findOneAndUpdate({ id }, { used: true });
    logInfo("Token marked as used");
  } catch (error) {
    logError("Error marking token as used:", error);
  }
};

export const deleteToken = async (id) => {
  try {
    await Token.deleteOne({ id });
    logInfo("Token deleted");
  } catch (error) {
    logError("Error deleting token:", error);
  }
};
