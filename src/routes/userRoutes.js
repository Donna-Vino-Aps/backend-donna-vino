import express from "express";
// import { requireAuth } from "../middleware/authMiddleware.js";

import {
  getUsers,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController/userController.js";
import { logout } from "../controllers/authControllers/logoutController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/profile", getUserProfile);
userRouter.put("/profile", updateUserProfile);
userRouter.post("/log-out", logout);

export default userRouter;
