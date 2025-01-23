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
      name: "John Doe",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "Tue Feb 01 1990",
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
      name: "John Doe",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "Tue Feb 01 1990",
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
      "BAD REQUEST: Email is not in a valid format, Password must be at least 8 characters long, Password must contain at least one uppercase letter, Password must contain at least one special character., Date Of Birth is a required field with valid format (e.g., 'Tue Feb 01 2022').",
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
      name: "John!",
      email: "john.doe@example.com",
      password: "Password1234!",
      dateOfBirth: "Tue Feb 01 1990",
    };

    const response = await request.post("/api/auth/sign-up/").send({ user });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.msg).toBe(
      "BAD REQUEST: Name can only contain letters, numbers, and a single space between words.",
    );
  });

  // Aquí seguirían los otros tests con los nombres de usuario actualizados...
});
