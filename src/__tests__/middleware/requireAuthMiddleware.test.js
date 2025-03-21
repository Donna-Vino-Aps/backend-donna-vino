import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
} from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../__testUtils__/dbMock.js";
import app from "../../app.js";
import User from "../../models/users/userModels.js";

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

  beforeEach(async () => {
    testUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser@example.com",
      password: "Test1234!",
      dateOfBirth: "1990-02-01",
    };

    await User.create(testUser);

    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: { email: testUser.email, password: testUser.password } });

    cookie = loginResponse.headers["set-cookie"]
      ? loginResponse.headers["set-cookie"][0]
      : "";
  });

  it("should return 401 if session cookie is missing", async () => {
    const response = await request.get("/api/user").set("Cookie", "");
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication required.");
  });

  it("should return 401 if session cookie has an invalid token", async () => {
    const response = await request
      .get("/api/user")
      .set("Cookie", ["session=invalidToken"]);
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });

  it("should return 401 if token lacks userId in payload", async () => {
    const tokenWithoutUserId = jwt.sign({}, process.env.JWT_SECRET);
    const response = await request
      .get("/api/user/")
      .set("Cookie", [`session=${tokenWithoutUserId}`]);
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });

  it("should allow access if token is valid and includes userId", async () => {
    const response = await request.get("/api/user").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
