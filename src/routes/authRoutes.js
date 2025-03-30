import express from "express";
import { preSignUp } from "../controllers/authControllers/preSignUpController.js";
import { signUp } from "../controllers/authControllers/signupController.js";
import { signInWithGoogleController } from "../controllers/authControllers/signInWithGoogleController.js";
import { login } from "../controllers/authControllers/loginController.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../controllers/authControllers/resetPasswordController.js";

const authRouter = express.Router();

authRouter.post("/pre-sign-up", preSignUp);
authRouter.get("/sign-up", signUp);
authRouter.post("/sign-in-with-google", signInWithGoogleController);
authRouter.post("/log-in", login);
authRouter.post("/request-password-reset", requestPasswordReset);
authRouter.put("/update-user-data", resetPassword);

export default authRouter;
