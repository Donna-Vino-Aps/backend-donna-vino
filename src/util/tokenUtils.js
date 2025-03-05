import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (email) => {
  const expiresIn = "6h";

  const payload = {
    email,
    id: uuidv4(),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
