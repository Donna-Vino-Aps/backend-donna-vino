import express from "express";
import { signup } from "../controllers/authControllers/signupController.js";
import { login } from "../controllers/authControllers/loginController.js";
import {
  resendVerificationLink,
  verifyEmail,
} from "../controllers/authControllers/emailVerificationController.js";

const authRouter = express.Router();

authRouter.post("/sign-up", signup);
authRouter.post("/log-in", login);

authRouter.post("/resend-verification-link", resendVerificationLink);
authRouter.get("/verify/:userId/:uniqueString", verifyEmail);

export default authRouter;
