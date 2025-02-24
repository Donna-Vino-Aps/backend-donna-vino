import { describe, it, expect, vi } from "vitest";
import User from "../../models/userModels.js";

describe("User Model Middleware", () => {
  it("should fail if the request is missing the name fields", async () => {
    const user = new User({
      firstName: "",
      lastName: "",
      email: "john@example.com",
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("User validation failed");
      expect(error.errors).toHaveProperty("firstName");
      expect(error.errors.firstName.kind).toBe("required");
      expect(error.errors).toHaveProperty("lastName");
      expect(error.errors.lastName.kind).toBe("required");
      return;
    }
    throw new Error(
      "Expected the user save operation to fail, but it succeeded.",
    );
  });

  it("should fail if the request is missing the email field", async () => {
    const user = new User({
      firstName: "Ana",
      lastName: "Laura",
      email: null,
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("User validation failed");
      expect(error.errors).toHaveProperty("email");
      expect(error.errors.email.kind).toBe("required");
      return;
    }
    throw new Error(
      "Expected the user save operation to fail, but it succeeded.",
    );
  });

  it("should save the user without errors", async () => {
    vi.spyOn(User.prototype, "save").mockResolvedValueOnce();
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    };

    try {
      const user = new User(userData);
      await user.save();
      expect(User.prototype.save).toHaveBeenCalledTimes(1);
    } catch (error) {
      throw new Error(
        "Expected the user save operation to succeed, but it failed with an error.",
      );
    }
  });
});
