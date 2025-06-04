import express from "express";
import { subscribeController } from "../controllers/subscribeControllers/subscribeController.js";
import { unSubscribeController } from "../controllers/subscribeControllers/unSubscribeController.js";

const subscribeRouter = express.Router();

subscribeRouter.post("/confirm-subscription", subscribeController);
subscribeRouter.post("/unsubscribe-request", unSubscribeController);

export default subscribeRouter;
