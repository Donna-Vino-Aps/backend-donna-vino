import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userValidationMiddleware } from "../middleware/userValidationMiddleware.js";

import {
  getUserProfile,
  updateUserProfile,
  deleteUser,
} from "../controllers/userController/userController.js";

const userRouter = express.Router();

userRouter.get("/:id", authMiddleware, getUserProfile);
userRouter.patch(
  "/:id",
  authMiddleware,
  userValidationMiddleware,
  updateUserProfile,
);
userRouter.delete("/:id", authMiddleware, deleteUser);

export default userRouter;
