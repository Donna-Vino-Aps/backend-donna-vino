import express from "express";
import {
  getUsers,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/profile", protect, getUserProfile);
userRouter.put("/user/profile", protect, updateUserProfile);
userRouter.post("/log-out", logout);

export default userRouter;
