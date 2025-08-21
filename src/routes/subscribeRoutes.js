import express from "express";
import { subscribeController } from "../controllers/subscribeControllers/subscribeController.js";
import { unSubscribeController } from "../controllers/subscribeControllers/unSubscribeController.js";

const subscribeRouter = express.Router();

subscribeRouter.post("/confirm-subscription", subscribeController);
subscribeRouter.get(
  "/unsubscribe-request",
  unSubscribeController.showUnsubscribePage,
);
subscribeRouter.post(
  "/unsubscribe-request",
  unSubscribeController.handleUnsubscribeRequest,
);

export default subscribeRouter;
