import express from "express";
import { getUsers } from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.post("/log-out", logout);

export default userRouter;
