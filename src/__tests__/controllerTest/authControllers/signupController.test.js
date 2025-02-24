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

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("../../../util/logging.js");

beforeAll(async () => {
  await connectToMockDB();
});

afterEach(async () => {
  await clearMockDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeMockDatabase();
});

describe("signupController", () => {
  test("Should pass if the request contains all required fields and successfully creates a user", async () => {
    const newUser = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "1990-02-01",
    };

    sendVerificationEmail.mockResolvedValue(true); // Simulate successful email sending

    const response = await request
      .post("/api/auth/sign-up/")
      .send({ user: newUser });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User created successfully");
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  test("Should pass if user creation succeeds but email sending fails", async () => {
    const newUser = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "1990-02-01",
    };

    sendVerificationEmail.mockResolvedValue(false); // Simulate email sending failure

    const response = await request
      .post("/api/auth/sign-up/")
      .send({ user: newUser });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.msg).toBe("User created successfully");
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  test("Should fail if the request body contains an empty user object", async () => {
    const user = {};

    const response = await request.post("/api/auth/sign-up/").send({ user });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "BAD REQUEST: First name is a required field., Last name is a required field., Email is a required field., Password is a required field., Date Of Birth is a required field.",
    );
  });

  test("Should fail if the request body does not contain a user object", async () => {
    const user = null;

    const response = await request.post("/api/auth/sign-up/").send({ user });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "Invalid request: You need to provide a valid 'user' object. Received: null",
    );
  });

  test("Should fail if the request body does not contain a user object", async () => {
    const response = await request.post("/api/auth/sign-up/").send();

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "Invalid request: You need to provide a valid 'user' object. Received: undefined",
    );
  });

  test("Should fail if the request does not contain a valid name", async () => {
    const user = {
      firstName: "John!",
      lastName: "Doe@",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "1990-02-01",
    };

    const response = await request.post("/api/auth/sign-up/").send({ user });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "BAD REQUEST: First name can only contain letters, numbers, and a single space between words., Last name can only contain letters, numbers, and a single space between words.",
    );
  });
});
