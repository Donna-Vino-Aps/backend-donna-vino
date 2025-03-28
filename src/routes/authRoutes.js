import express from "express";
import { preSignUp } from "../controllers/authControllers/preSignUpController.js";
import { signUp } from "../controllers/authControllers/signupController.js";
import { signInWithGoogleController } from "../controllers/authControllers/signInWithGoogleController.js";
import { login } from "../controllers/authControllers/loginController.js";
import { updateUserData } from "../controllers/authControllers/resetPasswordController.js";

const authRouter = express.Router();

authRouter.post("/pre-sign-up", preSignUp);
authRouter.get("/sign-up", signUp);
authRouter.post("/sign-in-with-google", signInWithGoogleController);
authRouter.post("/log-in", login);

authRouter.post("/update-user-data", updateUserData);

export default authRouter;
