import supertest from "supertest";
import app from "../../../app.js";
import User from "../../../models/userModels.js";

import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../../__testUtils__/dbMock.js";

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

describe("getUsers Controller", () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  test("Should return list of users when getUsers is successful", async () => {
    const users = [
      {
        name: "User 1",
        email: "user1@example.com",
        password: "Password1!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "User 2",
        email: "user2@example.com",
        password: "Password2!",
        dateOfBirth: "1990-02-01",
      },
    ];

    // Register the users
    await Promise.all(
      users.map(async (user) => {
        await request.post("/api/auth/sign-up").send({ user });
      }),
    );

    const loginUser = {
      email: "user1@example.com",
      password: "Password1!",
    };

    // Log in the first user and get the session cookie
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: loginUser });
    expect(loginResponse.status).toBe(200);

    const sessionCookie = loginResponse.headers["set-cookie"][0];

    // Request the list of users with the valid session cookie
    const response = await request
      .get("/api/user/")
      .set("Cookie", sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result).toBeInstanceOf(Array);
    expect(response.body.result.length).toBe(2);
  });

  test("Should return 401 if session cookie is not provided", async () => {
    // Make a request to the endpoint without a session cookie
    const response = await request.get("/api/user/");

    // Expecting a 401 because the session cookie is required
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication required.");
  });

  test("Should return 401 if session token does not match", async () => {
    const users = [
      {
        name: "User 1",
        email: "user1@example.com",
        password: "Password1!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "User 2",
        email: "user2@example.com",
        password: "Password2!",
        dateOfBirth: "1990-02-01",
      },
    ];

    // Register the users
    await Promise.all(
      users.map(async (user) => {
        await request.post("/api/auth/sign-up").send({ user });
      }),
    );

    const loginUser = {
      email: "user1@example.com",
      password: "Password1!",
    };

    // Log in the first user and get the valid session cookie
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: loginUser });
    expect(loginResponse.status).toBe(200);

    const validSessionCookie = loginResponse.headers["set-cookie"][0];

    // Modify the session cookie to simulate a token mismatch
    const modifiedSessionCookie = validSessionCookie.replace(
      /session=[^;]*/,
      "session=invalid_session_token",
    );

    // Make the request with the invalid session cookie
    const response = await request
      .get("/api/user/")
      .set("Cookie", modifiedSessionCookie);

    // Expecting 401 Unauthorized because the session token is invalid
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });

  test("Should return 401 if userId is not found in session token", async () => {
    const users = [
      {
        name: "User 1",
        email: "user1@example.com",
        password: "Password1!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "User 2",
        email: "user2@example.com",
        password: "Password2!",
        dateOfBirth: "1990-02-01",
      },
    ];

    // Register the users
    await Promise.all(
      users.map(async (user) => {
        await request.post("/api/auth/sign-up").send({ user });
      }),
    );

    const loginUser = {
      email: "user1@example.com",
      password: "Password1!",
    };

    // Log in the first user and get the valid session cookie
    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: loginUser });
    expect(loginResponse.status).toBe(200);

    const validSessionCookie = loginResponse.headers["set-cookie"][0];

    // Modify the session cookie to simulate missing userId in token
    const modifiedSessionCookie = validSessionCookie.replace(
      /session=[^;]*/,
      "session=invalid_userId_token",
    );

    // Make the request with the invalid session cookie
    const response = await request
      .get("/api/user/")
      .set("Cookie", modifiedSessionCookie);

    // Expecting 401 Unauthorized because userId is missing in session data
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("BAD REQUEST: Authentication failed.");
  });
});
