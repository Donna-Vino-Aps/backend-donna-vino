import supertest from "supertest";
import mongoose from "mongoose";
import app from "../../../app.js";
import Review from "../../../models/reviewModel.js";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../../__testUtils__/dbMock.js";
import { addMockReviewsToDB } from "../../../__testUtils__/reviewMock.js";
const request = supertest(app);

beforeAll(async () => {
  await connectToMockDB();
});

beforeEach(async () => {
  await addMockReviewsToDB();
});

afterEach(async () => {
  await clearMockDatabase();
});

afterAll(async () => {
  await closeMockDatabase();
});

describe("GET /api/reviews", () => {
  it("should return a list of reviews", async () => {
    const response = await request.get("/api/reviews");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.reviews)).toBe(true);
    expect(response.body.reviews.length).toBeGreaterThan(0);
    expect(response.body.reviews[0]).toHaveProperty("userId");
    expect(response.body.reviews[0]).toHaveProperty("rating");
    expect(response.body.reviews[0]).toHaveProperty("reviewText");
    expect(response.body.reviews[0]).toHaveProperty("createdAt");
  });
});

describe("POST /api/reviews", () => {
  it("should create a new review when valid data is provided", async () => {
    const validReview = {
      userId: new mongoose.Types.ObjectId(),
      rating: 5,
      reviewText: "Great product!",
    };

    const response = await request.post("/api/reviews").send(validReview);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.review).toHaveProperty("_id");
    expect(response.body.review.reviewText).toBe(validReview.reviewText);
  });

  it("should return 400 if required fields are missing", async () => {
    const invalidReview = {
      rating: 4,
      reviewText: "Missing userId!",
    };

    const response = await request.post("/api/reviews").send(invalidReview);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "Missing required fields. UserId, Rating and ReviewText are Required.",
    );
  });

  it("should return 500 if there is a server error", async () => {
    jest.spyOn(Review, "create").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const reviewData = {
      userId: new mongoose.Types.ObjectId(),
      rating: 5,
      reviewText: "Server should fail this request",
    };

    const response = await request.post("/api/reviews").send(reviewData);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("Server error.");
  });
});
