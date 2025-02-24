import express from "express";
import { contactUsController } from "../controllers/contactUsController/contactUsController";

const userRouter = express.Router();

userRouter.post("/", contactUsController);

export default userRouter;
