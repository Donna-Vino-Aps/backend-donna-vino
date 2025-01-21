import mongoose from "mongoose";
import connectDB from "../../../../config/db/connectDB.js";
import { logInfo, logError } from "../../../utils/logging.js";

jest.mock("mongoose");
jest.mock("../../../utils/logging.js");

describe("connectDB", () => {
  it("should successfully connect to MongoDB", async () => {
    mongoose.connect.mockResolvedValueOnce(true);

    await expect(connectDB()).resolves.toBeUndefined();

    expect(logInfo).toHaveBeenCalledWith("MongoDB connected successfully");
  });

  it("should handle MongoDB connection error", async () => {
    mongoose.connect.mockRejectedValueOnce(new Error("Connection failed"));

    await expect(connectDB()).rejects.toThrow("Connection failed");

    expect(logError).toHaveBeenCalledWith(
      "Error connecting to MongoDB:",
      expect.any(Error),
    );
  });
});
