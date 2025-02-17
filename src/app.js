import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requireAuth } from "./middleware/authMiddleware.js";
import userRouter from "./routes/userRoutes.js";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import emailRouter from "./routes/emailRoutes.js";

dotenv.config();

// Create an express server
const app = express();

// Tell express to use the json middleware
app.use(express.json());

app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "https://donna-vino-ecommerce-45b8fd279992.herokuapp.com",
  "https://donna-vino-aps-corporate-03ca98a66972.herokuapp.com",
];

// CORS configuration
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

/****** Attach routes ******/
/**
 * We use /api/ at the start of every route!
 * As we also host our client code on heroku we want to separate the API endpoints.
 */

app.use("/api/auth", authRouter);
app.use("/api/user", requireAuth, userRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/send-email", emailRouter);

export default app;
