import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (email) => {
  const expiresIn = "6h";

  const payload = {
    email: email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
