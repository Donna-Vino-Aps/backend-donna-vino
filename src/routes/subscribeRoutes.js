import express from "express";
// import { preSubscribeController } from "../controllers/subscribeControllers/preSubscribeController.js";
import { subscribeController } from "../controllers/subscribeControllers/subscribeController.js";
import { unSubscribeController } from "../controllers/subscribeControllers/unSubscribeController.js";

const subscribeRouter = express.Router();

// subscribeRouter.post("/pre-subscribe", preSubscribeController);
subscribeRouter.post("/confirm-subscription", subscribeController);
subscribeRouter.post("/unsubscribe-request", unSubscribeController);

export default subscribeRouter;
