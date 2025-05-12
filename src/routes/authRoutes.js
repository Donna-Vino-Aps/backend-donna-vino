import express from "express";
import { preSignUp } from "../controllers/authControllers/preSignUpController.js";
import { signUp } from "../controllers/authControllers/signupController.js";
import { signInWithGoogleController } from "../controllers/authControllers/signInWithGoogleController.js";
import { login } from "../controllers/authControllers/loginController.js";
import { resendVerificationEmail } from "../controllers/authControllers/resendVerificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/pre-sign-up", preSignUp);
authRouter.get("/check", requireAuth, (req, res) => {
  res.status(200).json({ success: true, msg: "Server is running" });
});
authRouter.get("/sign-up", signUp);
authRouter.post("/sign-in-with-google", signInWithGoogleController);
authRouter.get("/resend-verification-email", resendVerificationEmail);
authRouter.post("/log-in", login);

export default authRouter;
