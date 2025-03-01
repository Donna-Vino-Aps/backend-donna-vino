import { describe, it, beforeAll, afterAll, expect } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import PendingUser from "../../../models/users/pendingUserModel.js";
import bcrypt from "bcryptjs";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe("PendingUser Model", () => {
  it("should create a pending user successfully", async () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@example.com",
      password: "password123",
      birthdate: new Date("1995-05-10"),
      isSubscribed: true,
      verificationToken: "randomToken123",
    };

    const user = await PendingUser.create(userData);

    expect(user).toBeDefined();
    expect(user.firstName).toBe("John");
    expect(user.lastName).toBe("Doe");
    expect(user.email).toBe("johndoe@example.com");
    expect(user.isSubscribed).toBe(true);
    expect(user.verificationToken).toBe("randomToken123");
    expect(user.password).not.toBe("password123"); // Ensure password is hashed
  });

  it("should hash the password before saving", async () => {
    const userData = {
      firstName: "Jane",
      lastName: "Smith",
      email: "janesmith@example.com",
      password: "mypassword",
      birthdate: new Date("2000-01-01"),
      verificationToken: "token456",
    };

    const user = await PendingUser.create(userData);

    expect(user.password).not.toBe("mypassword");
    const isMatch = await bcrypt.compare("mypassword", user.password);
    expect(isMatch).toBe(true);
  });

  it("should enforce unique email constraint", async () => {
    const userData = {
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike@example.com",
      password: "securepass",
      birthdate: new Date("1992-08-15"),
      verificationToken: "token789",
    };

    await PendingUser.create(userData);

    // Attempt to create another user with the same email
    let error = null;
    try {
      await PendingUser.create(userData);
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  it("should require all required fields", async () => {
    const user = new PendingUser({});

    let error = null;
    try {
      await user.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.firstName).toBeDefined();
    expect(error.errors.lastName).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.birthdate).toBeDefined();
    expect(error.errors.verificationToken).toBeDefined();
  });
});
