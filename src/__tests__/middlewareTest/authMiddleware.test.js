import supertest from "supertest";
import jwt from "jsonwebtoken";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../__testUtils__/dbMock.js";

import app from "../../app.js";

const request = supertest(app);

beforeAll(async () => {
  await connectToMockDB();
});

afterEach(async () => {
  await clearMockDatabase();
});

afterAll(async () => {
  await closeMockDatabase();
});

describe("requireAuth Middleware Tests", () => {
  let testUser;
  let cookie;
  let validToken;

  beforeEach(async () => {
    testUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "Test1234!",
      dateOfBirth: "Tue Feb 01 1990",
    };

    // User sign-up
    await request.post("/api/auth/sign-up").send({ user: testUser });

    // User login
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: { email: testUser.email, password: testUser.password } });

    cookie = loginResponse.headers["set-cookie"];
    validToken = loginResponse.body.token;
  });

  it("should return 401 if session cookie is missing", async () => {
    const response = await request.get("/api/user").set("Cookie", "");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication required.");
  });

  it("should return 401 if session cookie has an invalid token", async () => {
    const invalidTokenCookie = ["session=invalidToken"];

    const response = await request
      .get("/api/user")
      .set("Cookie", invalidTokenCookie);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });

  it("should return 401 if token lacks userId in payload", async () => {
    const tokenWithoutUserId = jwt.sign({}, process.env.JWT_SECRET); // Token sin userId
    const tokenWithoutUserIdCookie = [`session=${tokenWithoutUserId}`];

    const response = await request
      .get("/api/user/")
      .set("Cookie", tokenWithoutUserIdCookie);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });

  it("should allow access if token is valid and includes userId", async () => {
    const response = await request.get("/api/user").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return 401 if both session cookie and Authorization header are missing", async () => {
    const response = await request
      .get("/api/user")
      .unset("Authorization")
      .set("Cookie", "");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication required.");
  });

  it("should use Authorization header token if session cookie is missing", async () => {
    const response = await request
      .get("/api/user")
      .unset("Cookie")
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should prioritize session cookie over Authorization header if both are present", async () => {
    const response = await request
      .get("/api/user")
      .set("Cookie", cookie)
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
