import User from "../../models/userModels.js";

describe("User Model Middleware", () => {
  test("should fail if the request is missing the firstName and lastName fields", async () => {
    const user = new User({
      firstName: "",
      lastName: "",
      email: "john@example.com",
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
      throw new Error(
        "Expected the user save operation to fail, but it succeeded.",
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("User validation failed");
      expect(error.errors).toHaveProperty("firstName");
      expect(error.errors.firstName.kind).toBe("required");
      expect(error.errors).toHaveProperty("lastName");
      expect(error.errors.lastName.kind).toBe("required");
    }
  });

  test("should fail if the request is missing the email field", async () => {
    const user = new User({
      firstName: "Ana",
      lastName: "Laura",
      email: null,
      password: "Password123!",
      dateOfBirth: "1990-01-01",
    });

    try {
      await user.save();
      throw new Error(
        "Expected the user save operation to fail, but it succeeded.",
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("User validation failed");
      expect(error.errors).toHaveProperty("email");
      expect(error.errors.email.kind).toBe("required");
    }
  });

  test("should fail if the request is not an object", async () => {
    const user = new User(null);

    try {
      await user.save();
      throw new Error(
        "Expected the user save operation to fail, but it succeeded.",
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain("User validation failed");
      expect(error.errors).toBeDefined();
      // For a local sign-up, required fields are firstName, lastName, email, password, and dateOfBirth.
      expect(Object.keys(error.errors).length).toBe(5);
      Object.values(error.errors).forEach((validationError) => {
        expect(validationError).toHaveProperty(
          "message",
          `Path \`${validationError.path}\` is required.`,
        );
      });
    }
  });

  it("should save the user without errors", async () => {
    // Mock the save method to simulate a successful save operation.
    User.prototype.save = jest.fn().mockResolvedValueOnce();

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
      expect(error).toBeUndefined();
      throw new Error(
        "Expected the user save operation to succeed, but it failed with an error.",
      );
    }
  });
});
