import Review from "../models/reviewModel.js";

export const addReviewToMockDB = async (newReview) => {
  if (!newReview.userId || !newReview.rating || !newReview.reviewText) {
    throw new Error(
      `Invalid review attempting to be added to the Database. Review attempted to be added: ${JSON.stringify(
        newReview,
      )}. Missing required fields.`,
    );
  }

  const review = new Review({
    userId: newReview.userId,
    rating: newReview.rating,
    reviewText: newReview.reviewText,
    createdAt: newReview.createdAt || new Date(), // Ensure timestamp is set
  });
  await review.save();
};

export const findReviewInMockDB = async (userId) => {
  if (typeof userId !== "string") {
    throw new Error(
      `Invalid userId given! Should be a string, but received: ${userId}`,
    );
  }

  return await Review.find({ userId }).sort({ createdAt: -1 });
};

export const addMockReviewsToDB = async () => {
  await Review.insertMany([
    {
      userId: "65b8f8c4e7d2c3b8e9f0e4a7",
      rating: 5,
      reviewText: "Amazing product!",
      createdAt: new Date("2024-02-08T10:15:30.000Z"),
    },
    {
      userId: "65b8f8c4e7d2c3b8e9f0e4a8",
      rating: 4,
      reviewText: "Good but could be better.",
      createdAt: new Date("2024-02-07T15:30:00.000Z"),
    },
  ]);
};
