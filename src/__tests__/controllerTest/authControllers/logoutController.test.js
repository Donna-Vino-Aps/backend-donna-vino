import supertest from "supertest";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../../__testUtils__/dbMock.js";
import app from "../../../app.js";
import { sendVerificationEmail } from "../../../controllers/authControllers/emailVerificationController.js";

const request = supertest(app);

jest.mock(
  "../../../controllers/authControllers/emailVerificationController.js",
  () => ({
    sendVerificationEmail: jest.fn(),
    resendVerificationLink: jest.fn(),
    verifyEmail: jest.fn(),
  }),
);

beforeAll(async () => {
  await connectToMockDB();
});

afterEach(async () => {
  await clearMockDatabase();
});

afterAll(async () => {
  await closeMockDatabase();
});

describe("logoutController", () => {
  let testUser;
  let cookie;
  let token;

  beforeEach(async () => {
    testUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "Test1234!",
      dateOfBirth: "1990-02-01",
    };

    sendVerificationEmail.mockResolvedValue(true);

    // User sign-up
    await request.post("/api/auth/sign-up").send({ user: testUser });

    // User login, getting cookie and token
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: { email: testUser.email, password: testUser.password } });

    cookie = loginResponse.headers["set-cookie"];
    token = loginResponse.body.token;
  });

  test("Should pass if the session cookie is cleared after logout", async () => {
    const logoutResponse = await request
      .post("/api/user/log-out")
      .set("Cookie", cookie);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe("User successfully logged out");

    // Check that the session cookie is cleared correctly
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

  test("Should fail if no valid session cookie is provided", async () => {
    const logoutResponse = await request.post("/api/user/log-out");

    expect(logoutResponse.status).toBe(401); // 401 Unauthorized
    expect(logoutResponse.body.success).toBe(false);
    expect(logoutResponse.body.msg).toBe(
      "BAD REQUEST: Authentication required.",
    );
  });

  test("Should pass if a valid token is provided in Authorization header even if there is not cookie-sesion", async () => {
    const logoutResponse = await request
      .post("/api/user/log-out")
      .set("Authorization", `Bearer ${token}`);
    // .set("Cookie", cookie);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe("User successfully logged out");
  });

  test("Cookies should be cleared after logout", async () => {
    const logoutResponse = await request
      .post("/api/user/log-out")
      .set("Cookie", cookie);

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

  test("Should not allow logout without being logged in", async () => {
    const logoutResponse = await request.post("/api/user/log-out");

    expect(logoutResponse.status).toBe(401);
    expect(logoutResponse.body.success).toBe(false);
    expect(logoutResponse.body.msg).toBe(
      "BAD REQUEST: Authentication required.",
    );
  });
});
