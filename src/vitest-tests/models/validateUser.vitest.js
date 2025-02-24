import { describe, it, expect } from "vitest";
import { validateUser } from "../../models/userModels";

describe("validateUser function", () => {
  it("should return an empty array if all required fields are provided", () => {
    const user = {
      name: "Jane Doe",
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "2024-02-04",
    };

    const errors = validateUser(user);
    expect(errors).toHaveLength(0);
  });

  it("should return an error message if the name is null", () => {
    const user = {
      name: null,
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };

    const errors = validateUser(user);
    expect(errors).toHaveLength(1);
    expect(errors).toContainEqual("Name is a required field.");
  });

  it("should return error messages if the email is not in a valid format", () => {
    const invalidEmails = [
      { email: " janedoe@example.com" },
      { email: "janedoeexample.com" },
      { email: "janedoe@example" },
    ];

    invalidEmails.forEach((user) => {
      const errors = validateUser({
        ...user,
        name: "Jane Doe",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      });

      expect(errors).toHaveLength(1);
      expect(errors).toContainEqual("Email is not in a valid format");
    });
  });
});
