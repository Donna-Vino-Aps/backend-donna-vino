import supertest from "supertest";
import {
  connectToMockDB,
  closeMockDatabase,
  clearMockDatabase,
} from "../../__testUtils__/dbMock.js";
import app from "../../app.js";
import {
  describe,
  test,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
  expect,
} from "vitest";

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

describe("loginController", () => {
  let testUser;

  beforeEach(async () => {
    testUser = {
      name: "John Doe",
      email: "johndoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };

    await request.post("/api/auth/sign-up").send({ user: testUser });
  });

  test("Should fail if the request does not contain a valid email", async () => {
    const userTest = {
      email: "example.com",
      password: "Password123!",
    };

    const response = await request
      .post("/api/auth/log-in")
      .send({ user: userTest });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "No user was found associated with the provided email address. Please verify your email and try again or register if you are a new user.",
    );
  });

  test("Should fail if the request contains an empty password", async () => {
    const userData = {
      email: "johndoe@example.com",
      password: "",
    };

    const response = await request
      .post("/api/auth/log-in")
      .send({ user: userData });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe(
      "BAD REQUEST: Email and password are required.",
    );
  });

  test("Should fail if the request does not contain a valid password", async () => {
    const userData = {
      email: "johndoe@example.com",
      password: "invalidPassword123",
    };

    const response = await request
      .post("/api/auth/log-in")
      .send({ user: userData });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "The password provided is incorrect. Please verify your password and try again.",
    );
  });

  test("Should fail if the request is given with an empty object", async () => {
    const response = await request
      .post("/api/auth/log-in")
      .send({ user: null });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe("Invalid request body");
  });

  test("Should fail if the request contains invalid fields", async () => {
    const userData = {
      invalidField: "12345",
      email: "johndoe@example.com",
      password: "Password123!",
    };

    const response = await request
      .post("/api/auth/log-in")
      .send({ user: userData });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe(
      "BAD REQUEST: Invalid fields present in the request.",
    );
  });

  test("Should pass if the request contains a valid password and email", async () => {
    const userData = {
      email: "johndoe@example.com",
      password: "Password123!",
    };

    const loginResponse = await request
      .post("/api/auth/log-in")
      .send({ user: userData });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.msg).toBe("Login successful");
  });
});
