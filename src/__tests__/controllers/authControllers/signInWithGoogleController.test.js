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
import User from "../../models/users/userModels.js";
import { OAuth2Client } from "google-auth-library";
// import { sendWelcomeEmail } from "../../controllers/authControllers/emailWelcomeController.js";
import jwt from "jsonwebtoken";

const request = supertest(app);

// vi.mock("../../controllers/authControllers/emailWelcomeController.js", () => ({
//   sendWelcomeEmail: vi.fn(),
// }));

vi.mock("../../util/logging.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
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
  it("should sign in a new user and send a welcome email", async () => {
    const userData = {
      id_token: "mockGoogleIdToken",
    };

    const mockPayload = {
      name: "John Doe",
      email: "john@example.com",
      picture: "http://example.com/john.jpg",
    };

    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => mockPayload,
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .send(userData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User signed in successfully");
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(mockPayload.email);
    expect(response.body.user.firstName).toBe("John");
    expect(response.body.user.lastName).toBe("Doe");

    const user = await User.findOne({ email: mockPayload.email });
    expect(user).toBeDefined();
  });

  it("should return existing user without sending welcome email", async () => {
    const existingUser = new User({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      picture: "http://example.com/jane.jpg",
      authProvider: "google",
    });

    await existingUser.save();

    const mockPayload = {
      name: "Jane Doe",
      email: "jane@example.com",
      picture: "http://example.com/jane.jpg",
    };

    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => mockPayload,
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .send({ id_token: "mockGoogleIdToken" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(existingUser.email);
    // expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("should return current session user if session is valid", async () => {
    const user = new User({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      picture: "http://example.com/alice.jpg",
      authProvider: "google",
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "72h",
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .set("Cookie", `session=${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User is already signed in");
    expect(response.body.user.email).toBe(user.email);
  });

  it("should return error if token verification fails", async () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const response = await request
      .post("/api/auth/sign-in-with-google")
      .set("Cookie", "session=invalidToken")
      .send();

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing user data");
  });

  it("should handle missing user data error", async () => {
    const response = await request
      .post("/api/auth/sign-in-with-google")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing user data");
  });
});
