import express from "express";

import {
  getUsers,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/profile/:id", getUserProfile);
userRouter.patch("/profile/:id", updateUserProfile);
userRouter.post("/logout", logout);

export default userRouter;
