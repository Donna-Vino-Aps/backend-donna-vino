import mongoose from "mongoose";
import connectDB from "../../db/connectDB.js";
import { logInfo, logError } from "../../util/logging.js";

jest.mock("mongoose");
jest.mock("../../util/logging.js");

describe("connectDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log success message when connection is successful", async () => {
    mongoose.connect.mockResolvedValueOnce();

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    expect(logInfo).toHaveBeenCalledWith("MongoDB connected successfully");
    expect(logError).not.toHaveBeenCalled();
  });

  it("should log error message when connection fails", async () => {
    const error = new Error("Connection failed");
    mongoose.connect.mockRejectedValueOnce(error);

    await expect(connectDB()).rejects.toThrow("Connection failed");

    expect(logError).toHaveBeenCalledWith(
      "Error connecting to MongoDB:",
      error,
    );
    expect(logInfo).not.toHaveBeenCalled();
  });
});
