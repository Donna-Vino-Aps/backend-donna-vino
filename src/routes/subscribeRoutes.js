import express from "express";
import { subscribeUser } from "../controllers/sendEmailControllers/subscribeController.js";

const subscribeRouter = express.Router();

subscribeRouter.post("/", subscribeUser);

export default subscribeRouter;
