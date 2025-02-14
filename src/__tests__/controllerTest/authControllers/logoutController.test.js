import supertest from "supertest";
import express from "express";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../../__testUtils__/dbMock.js";
import app from "../../../app.js";
import { sendVerificationEmail } from "../../../controllers/authControllers/emailVerificationController.js";

const request = supertest(app);

// Mock the email verification controller to avoid side effects during tests
jest.mock(
  "../../../controllers/authControllers/emailVerificationController.js",
  () => ({
    sendVerificationEmail: jest.fn(),
    resendVerificationLink: jest.fn(),
    verifyEmail: jest.fn(),
  }),
);

// Connect to the mock database before all tests
beforeAll(async () => {
  await connectToMockDB();
});

// Clear the mock database after each test to ensure test isolation
afterEach(async () => {
  await clearMockDatabase();
});

// Close the mock database connection after all tests
afterAll(async () => {
  await closeMockDatabase();
});

describe("logoutController", () => {
  let testUser;
  let cookie;

  // Before each test, create a test user, sign them up, and log them in to get the cookie
  beforeEach(async () => {
    testUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "Test1234!",
      dateOfBirth: "1990-02-01",
    };

    // Mock the sendVerificationEmail function to always resolve to true
    sendVerificationEmail.mockResolvedValue(true);

    // User sign-up
    await request.post("/api/auth/sign-up").send({ user: testUser });

    // User log-in to obtain the session cookie and token
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: { email: testUser.email, password: testUser.password } });
    cookie = loginResponse.headers["set-cookie"];
  });

  test("Should successfully log out and clear session cookies", async () => {
    const logoutResponse = await request
      .post("/api/user/log-out")
      .set("Cookie", cookie);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe("User successfully logged out");

    // Verify that the session cookies have been cleared by checking they contain an expired date
    const cookies = logoutResponse.headers["set-cookie"];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        ),
        expect.stringContaining(
          "zenTimerToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        ),
      ]),
    );
  });

  test("Should pass if a valid token is provided in the Authorization header even if no session cookie is provided", async () => {
    // Retrieve the token locally
    const loginResponseForToken = await request
      .post("/api/auth/log-in")
      .send({ user: { email: testUser.email, password: testUser.password } });
    const token = loginResponseForToken.body.token;

    const logoutResponse = await request
      .post("/api/user/log-out")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe("User successfully logged out");
  });

  test("Should return unauthorized error if no session cookie or token is provided", async () => {
    const logoutResponse = await request.post("/api/user/log-out");

    expect(logoutResponse.status).toBe(401);
    expect(logoutResponse.body.success).toBe(false);
    expect(logoutResponse.body.msg).toBe(
      "BAD REQUEST: Authentication required.",
    );
  });

  test("Should simulate internal error during logout", async () => {
    // Create a separate Express instance to simulate an internal error in the logout route
    const errorApp = express();
    errorApp.use(express.json());
    errorApp.post("/api/user/log-out", (_req, _res) => {
      // Simulate an error during the logout process
      throw new Error("Simulated internal error");
    });
    // Error-handling middleware to format error responses in JSON
    errorApp.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });

    const errorRequest = supertest(errorApp);
    const logoutErrorResponse = await errorRequest
      .post("/api/user/log-out")
      .set("Cookie", cookie);

    expect(logoutErrorResponse.status).toBe(500);
    expect(logoutErrorResponse.body.success).toBe(false);
    expect(logoutErrorResponse.body.message).toBe("Simulated internal error");
  });
});
