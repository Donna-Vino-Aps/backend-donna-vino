import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { saveTokenId } from "../token/tokenRepository.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = async (email) => {
  const expiresIn = "15m";
  const tokenId = uuidv4();

  const payload = { email, id: tokenId };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

  await saveTokenId(tokenId);

  return token;
};
