// import { logError } from "../src/util/logging.js"; // Adjust import if needed
// import connectDB from "../src/db/connectDB.js"; // Adjust import if needed
// import app from "../src/app.js"; // Adjust import if needed
// import dotenv from "dotenv";
// dotenv.config();

// jest.mock("../src/db/connectDB.js");
// jest.mock("../src/util/logging.js");

// describe("Server startup tests", () => {
//   let listenSpy;

//   beforeAll(() => {
//     // Mock listen method of app to ensure it's called correctly
//     listenSpy = jest
//       .spyOn(app, "listen")
//       .mockImplementation((port, callback) => callback());
//   });

//   afterAll(() => {
//     jest.restoreAllMocks(); // Clean up mocks after tests
//   });

//   it("should call connectDB and start the server on the correct port", async () => {
//     // Mock the environment variables
//     process.env.PORT = 3000;

//     // Mock connectDB to resolve without error
//     connectDB.mockResolvedValue();

//     // Import and run the server startup logic
//     const { startServer } = require("../src/server.js");

//     // Run the server startup
//     await startServer();

//     // Test if connectDB and listen were called correctly
//     expect(connectDB).toHaveBeenCalledTimes(1);
//     expect(listenSpy).toHaveBeenCalledWith(3000, expect.any(Function));
//   });

//   it("should log an error if the port is not defined", async () => {
//     // Mock the environment variable for missing PORT
//     delete process.env.PORT;

//     // Mock connectDB to resolve without error
//     connectDB.mockResolvedValue();

//     // Run the server startup
//     const { startServer } = require("../src/server.js");

//     // Run the server startup
//     await startServer();

//     // Check if error logging was triggered
//     expect(logError).toHaveBeenCalledWith(
//       new Error("Cannot find a PORT number, did you create a .env file?"),
//     );
//   });

//   it("should catch and log errors during startup", async () => {
//     // Mock the environment variable for missing PORT
//     process.env.PORT = 3000;

//     // Mock connectDB to throw an error
//     connectDB.mockRejectedValue(new Error("Database connection failed"));

//     // Run the server startup
//     const { startServer } = require("../src/server.js");

//     // Run the server startup
//     await startServer();

//     // Check if error logging was triggered for the database connection failure
//     expect(logError).toHaveBeenCalledWith(
//       expect.objectContaining({ message: "Database connection failed" }),
//     );
//   });
// });
