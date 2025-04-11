import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  getUsers,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/user/profile", requireAuth, getUserProfile);
userRouter.put("/user/profile", requireAuth, updateUserProfile);
userRouter.post("/log-out", logout);

export default userRouter;
