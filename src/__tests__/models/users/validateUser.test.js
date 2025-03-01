import { describe, it, expect } from "vitest";
import { validateUser } from "../../../models/users/userModels.js";

describe("validateUser function", () => {
  it("should return an empty array if all required fields are provided", () => {
    const user = {
      firstName: "Jane",
      lastName: "Doe",
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "2024-02-04",
    };

    const errors = validateUser(user);
    expect(errors).toHaveLength(0);
  });

  it("should return error messages if the name fields are null", () => {
    const user = {
      firstName: null,
      lastName: null,
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };

    const errors = validateUser(user);
    expect(errors).toContainEqual("First name is a required field.");
    expect(errors).toContainEqual("Last name is a required field.");
    expect(errors).toHaveLength(2);
  });

  it("should return error messages if the email is not in a valid format", () => {
    const invalidEmails = [
      { email: " janedoe@example.com" },
      { email: "janedoeexample.com" },
      { email: "janedoe@example" },
    ];

    invalidEmails.forEach((data) => {
      const errors = validateUser({
        ...data,
        firstName: "Jane",
        lastName: "Doe",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      });
      expect(errors).toContainEqual("Email is not in a valid format.");
      expect(errors).toHaveLength(1);
    });
  });
});
