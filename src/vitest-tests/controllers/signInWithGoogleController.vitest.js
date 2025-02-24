import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import {
  describe,
  it,
  beforeAll,
  afterEach,
  afterAll,
  expect,
  vi,
} from "vitest";
import supertest from "supertest";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../__testUtils__/dbMock.js";
import app from "../../app.js";
import User from "../../models/userModels.js";
import { OAuth2Client } from "google-auth-library";
import { sendWelcomeEmail } from "../../controllers/authControllers/emailWelcomeController.js";
import jwt from "jsonwebtoken";

const request = supertest(app);

vi.mock("../../controllers/authControllers/emailWelcomeController.js", () => ({
  sendWelcomeEmail: vi.fn(),
}));

beforeAll(async () => {
  await connectToMockDB();
});

afterEach(async () => {
  await clearMockDatabase();
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeMockDatabase();
});

describe("signInWithGoogleController", () => {
  it("Should sign in successfully and create a new user if not exists", async () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      picture: "http://example.com/john.jpg",
    };

    sendWelcomeEmail.mockResolvedValue(true);

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .send(userData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User signed in successfully");
    expect(response.body.token).toBeDefined();
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);

    // Verify that the response contains the correct user details
    expect(response.body.user.firstName).toBe(userData.firstName);
    expect(response.body.user.lastName).toBe(userData.lastName);
    expect(response.body.user.email).toBe(userData.email);
    expect(response.body.user.picture).toBe(userData.picture);

    const user = await User.findOne({ email: userData.email });
    expect(user).toBeDefined();
  });

  it("Should sign in an existing user without creating a new one", async () => {
    const existingUser = new User({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      picture: "http://example.com/jane.jpg",
      password: "hashedpassword",
      authProvider: "google",
    });

    await existingUser.save();

    sendWelcomeEmail.mockResolvedValue(true);

    const response = await request.post("/api/auth/sign-in-with-google").send({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      picture: "http://example.com/jane.jpg",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User signed in successfully");
    expect(response.body.token).toBeDefined();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("Should verify an existing session and return user data", async () => {
    const user = new User({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      picture: "http://example.com/alice.jpg",
      password: "hashedpassword",
      authProvider: "google",
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "72h",
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .set("Cookie", `session=${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User is already signed in");
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.user.firstName).toBe(user.firstName);
    expect(response.body.user.lastName).toBe(user.lastName);
  });

  it("Should return error if token verification fails", async () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Missing user data");
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .set("Cookie", "session=invalidToken")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing user data");
  });

  it("Should sign in successfully with a valid Google token", async () => {
    const userData = {
      firstName: "Bob",
      lastName: "Brown",
      email: "bob@example.com",
      picture: "http://example.com/bob.jpg",
      token: "mockGoogleIdToken",
    };

    const mockPayload = {
      name: "Bob Brown",
      email: "bob@example.com",
      picture: "http://example.com/bob.jpg",
    };

    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => mockPayload,
    });

    sendWelcomeEmail.mockResolvedValue(true);

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .send(userData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(userData.email);
    // Since the controller splits the name from the Google payload,
    // we expect firstName and lastName to be "Bob" and "Brown" respectively.
    expect(response.body.user.firstName).toBe("Bob");
    expect(response.body.user.lastName).toBe("Brown");
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);

    const user = await User.findOne({ email: userData.email });
    expect(user).toBeDefined();
  });
});
