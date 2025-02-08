import express from "express";
import { submitReview } from "../controllers/reviewController/reviewController";

const reviewRouter = express.Router();

reviewRouter.post("/reviews", submitReview);

export default reviewRouter;
