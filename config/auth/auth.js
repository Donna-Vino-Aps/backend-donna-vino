export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: "1h",
};

export const oauthConfig = {
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
};
