import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requireAuth } from "./middleware/authMiddleware.js";
import bodyParser from "body-parser";
import userRouter from "./routes/userRoutes.js";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import contactUsRouter from "./routes/contactUsRoutes.js";
import subscribeRouter from "./routes/subscribeRoutes.js";
import {
  contactLimiter,
  contactHourlyLimiter,
} from "./middleware/rateLimitMiddleware.js";
import cloudinaryRouter from "./routes/cloudinaryRoutes.js";

dotenv.config();

// Create an express server
const app = express();

app.use("/api/upload", cloudinaryRouter);

// Tell express to use the json middleware
app.use(express.json());

app.use(cookieParser());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const allowedOrigins = [
  "http://www.donnavino.dk",
  "https://www.donnavino.dk",
  "https://donnavino.dk",
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:5000",
  "http://localhost:5001",
  "https://donna-vino-ecommerce-45b8fd279992.herokuapp.com",
  "https://donna-vino-aps-corporate-03ca98a66972.herokuapp.com",
  "https://donna-vino-aps-corporate-prod-365809e9340a.herokuapp.com",
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

// web endpoints
app.use(
  "/api/contact-us",
  contactLimiter,
  contactHourlyLimiter,
  contactUsRouter,
);

app.use("/api/subscribe", subscribeRouter);

export default app;
