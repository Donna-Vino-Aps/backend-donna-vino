import express from "express";
import { preSubscribeController } from "../controllers/subscribeControllers/preSubscribeController.js";
import { subscribeController } from "../controllers/subscribeControllers/subscribeController.js";
import { unSubscribeController } from "../controllers/subscribeControllers/unSubscribeController.js";
import { resendSubscriptionEmailController } from "../controllers/subscribeControllers/resendSubscriptionEmailController.js";

const subscribeRouter = express.Router();

subscribeRouter.post("/pre-subscribe", preSubscribeController);
subscribeRouter.post("/confirm-subscription", subscribeController);
subscribeRouter.post("/un-subscribe", unSubscribeController);
subscribeRouter.post("/resend-email", resendSubscriptionEmailController);

export default subscribeRouter;
