import cors from "cors";

const allowedOrigins = [
  "http://www.donnavino.dk",
  "https://www.donnavino.dk",
  "https://donnavino.dk",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5001",
  "https://donna-vino-ecommerce-45b8fd279992.herokuapp.com",
  "https://donna-vino-aps-corporate-03ca98a66972.herokuapp.com",
  "https://donna-vino-aps-corporate-prod-365809e9340a.herokuapp.com",
];

const corsConfig = cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

export default corsConfig;
