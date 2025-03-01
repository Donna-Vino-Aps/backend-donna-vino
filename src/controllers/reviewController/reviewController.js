import Review from "../../models/review/reviewModel.js";

export const submitReview = async (req, res) => {
  try {
    const { userId, rating, reviewText } = req.body;

    if (!userId || !rating || !reviewText) {
      return res.status(400).json({
        success: false,
        msg: "Missing required fields. UserId, Rating and ReviewText are Required.",
      });
    }

    const newReview = await Review.create({
      userId,
      rating,
      reviewText,
    });

    return res.status(201).json({
      success: true,
      msg: "Review submitted successfully.",
      review: newReview,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, msg: "Server error.", error: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(10);
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, msg: "Server error.", error: error.message });
  }
};
