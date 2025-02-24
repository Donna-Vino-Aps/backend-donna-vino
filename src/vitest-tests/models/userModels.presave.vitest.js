import { describe, it, expect, vi } from "vitest";
import User from "../../models/userModels";

describe("User Model Middleware", () => {
  it("should fail if the request is missing the name field", async () => {
    const user = new User({
      name: "",
      email: "john@example.com",
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("user validation failed");
      expect(error.errors).toHaveProperty("name");
      expect(error.errors.name.kind).toBe("required");
      return;
    }

    throw new Error(
      "Expected the user save operation to fail, but it succeeded.",
    );
  });

  it("should fail if the request is missing the email field", async () => {
    const user = new User({
      name: "Ana Laura",
      email: null,
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("user validation failed");
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
      name: "John Doe",
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
