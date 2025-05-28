import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  getUsers,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", requireAuth, getUsers);
userRouter.get("/profile/:id", requireAuth, getUserProfile);
userRouter.patch("/profile/:id", requireAuth, updateUserProfile);
userRouter.post("/log-out", requireAuth, logout);

export default userRouter;
