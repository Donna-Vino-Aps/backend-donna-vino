import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export const generateToken = (email) => {
  const expiresIn = "6h";

  const payload = {
    email: email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
