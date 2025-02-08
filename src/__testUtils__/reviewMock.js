import Review from "../models/reviewModel.js";

export const addReviewToMockDB = async (newReview) => {
  if (!newReview.userId || !newReview.rating || !newReview.reviewText) {
    throw new Error(
      `Invalid review attempting to be added to the Database. Review attempted to be added: ${JSON.stringify(
        newReview,
      )}. Missing required fields.`,
    );
  }

  const review = new Review(newReview);
  await review.save();
};

export const findReviewInMockDB = async (userId) => {
  if (typeof userId !== "string") {
    throw new Error(
      `Invalid userId given! Should be a string, but received: ${userId}`,
    );
  }

  const review = await Review.findOne({ userId });
  return review;
};
