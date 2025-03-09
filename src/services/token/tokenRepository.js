import Token from "../../models/token/tokensModel.js";
import { logError } from "../../util/logging.js";

export const saveTokenId = async (id) => {
  try {
    await Token.create({ id });
  } catch (error) {
    logError("Error saving token:", error);
  }
};

export const isTokenUsed = async (id) => {
  const token = await Token.findOne({ id });
  return token?.used || !token;
};

export const markTokenAsUsed = async (id) => {
  await Token.findOneAndUpdate({ id }, { used: true });
};
