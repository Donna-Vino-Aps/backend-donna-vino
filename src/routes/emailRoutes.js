import express from "express";
import { sendEmailController } from "../controllers/sendEmailControllers/sendEmailController.js";

const emailRouter = express.Router();

emailRouter.post("/", sendEmailController);

export default emailRouter;
