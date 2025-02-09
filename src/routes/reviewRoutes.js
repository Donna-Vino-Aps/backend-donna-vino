import express from "express";
import {
  submitReview,
  getReviews,
} from "../controllers/reviewController/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.get("/reviews", getReviews);
reviewRouter.post("/reviews", submitReview);

export default reviewRouter;
