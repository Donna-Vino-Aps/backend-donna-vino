import express from "express";

import {
  getUsers,
  getUserProfile,
  updateUserProfile,
  deleteUser,
} from "../controllers/userController/userController.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/profile/:id", getUserProfile);
userRouter.patch("/profile/:id", updateUserProfile);
userRouter.delete("/profile/:id", deleteUser);

export default userRouter;
