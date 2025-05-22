import express from "express";
import { getUsers } from "../controllers/userController/userController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);

export default userRouter;
