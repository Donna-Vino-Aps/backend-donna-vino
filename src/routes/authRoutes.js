import express from "express";
import { signup } from "../controllers/authControllers/signupController.js";
import { signInWithGoogleController } from "../controllers/authControllers/signInWithGoogleController.js";
import { login } from "../controllers/authControllers/loginController.js";
import { updateUserData } from "../controllers/authControllers/resetPasswordController.js";

const authRouter = express.Router();

authRouter.post("/sign-up", signup);
authRouter.post("/sign-in-with-google", signInWithGoogleController);
authRouter.post("/log-in", login);

authRouter.post("/update-user-data", updateUserData);

export default authRouter;
