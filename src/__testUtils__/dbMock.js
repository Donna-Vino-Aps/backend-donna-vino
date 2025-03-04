/**
 * Adapted from https://kimlehtinen.com/how-to-setup-jest-for-node-js-mongoose-typescript-projects/
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoMemServer;

/**
 * Connecting to the Database
 */
export const connectToMockDB = async () => {
  if (mongoMemServer !== null && mongoMemServer !== undefined) {
    // Prevent overwriting the database when tests are running
    throw new Error(
      `Error in testing: mongoMemServer should not be set when calling connectToMockDB. Expected null or undefined, but received: ${mongoMemServer.toString()}`,
    );
  }
  mongoose.set("strictQuery", false);
  mongoMemServer = await MongoMemoryServer.create({
    instance: {
      dbName: "test-db", // Custom database name
    },
    binary: {
      version: "6.0.13", // Specify MongoDB version
    },
    timeoutMS: 60000, // Set a timeout to avoid long waits
  });

  const uri = mongoMemServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

/**
 * Closing the Database connection
 */
export const closeMockDatabase = async () => {
  try {
    // Drop the database
    await mongoose.connection.dropDatabase();
    // Close the mongoose connection
    await mongoose.connection.close();
    // Stop the memory server
    await mongoMemServer.stop();
  } catch (error) {
    console.error("Error while closing the mock database:", error);
  } finally {
    // Clean up the variable
    mongoMemServer = null;
  }
};

/**
 * Clear the database, used to clean between tests
 */
export const clearMockDatabase = async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    if (Object.hasOwnProperty.call(collections, key)) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};
