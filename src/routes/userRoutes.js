import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

import {
  getUserProfile,
  updateUserProfile,
  deleteUser,
} from "../controllers/userController/userController.js";

const userRouter = express.Router();

userRouter.get("/profile/:id", authMiddleware, getUserProfile);
userRouter.patch("/profile/:id", authMiddleware, updateUserProfile);
userRouter.delete("/profile/:id", authMiddleware, deleteUser);

export default userRouter;
