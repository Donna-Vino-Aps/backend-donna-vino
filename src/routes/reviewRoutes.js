import express from "express";
import {
  submitReview,
  getReviews,
} from "../controllers/reviewController/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.get("/", getReviews);
reviewRouter.post("/", submitReview);

export default reviewRouter;
