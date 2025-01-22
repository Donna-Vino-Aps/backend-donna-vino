import { logError } from "../../utils/logging.js";
import connectDB from "../../../config/db/connectDB.js";
import app from "../../app.js";
import { startServer } from "../../../config/server.js";

jest.mock("../../../config/db/connectDB.js");
jest.mock("../../utils/logging.js", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
}));

describe("Server startup tests", () => {
  let listenSpy;

  beforeAll(() => {
    // Mock listen method of app to ensure it's called correctly
    listenSpy = jest
      .spyOn(app, "listen")
      .mockImplementation((port, callback) => callback());
  });

  afterAll(() => {
    jest.restoreAllMocks(); // Clean up mocks after tests
  });

  it("should call connectDB and start the server on the correct port", async () => {
    connectDB.mockResolvedValue();

    await startServer();

    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(listenSpy).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  it("should catch and log errors during startup", async () => {
    connectDB.mockRejectedValue(new Error("Database connection failed"));

    await startServer();

    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Database connection failed" }),
    );
  });
});
