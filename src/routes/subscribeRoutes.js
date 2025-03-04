import express from "express";
import { preSubscribeController } from "../controllers/subscribeControllers/preSubscribeController.js";

const subscribeRouter = express.Router();

subscribeRouter.post("/pre-subscribe", preSubscribeController);

export default subscribeRouter;
