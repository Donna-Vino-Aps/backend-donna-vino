import { validateUser } from "../../models/userModels.js";

describe("validateUser function", () => {
  test("should return an empty array if all required fields are provided", () => {
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

  // Uncomment and update if needed:
  // test("should return an array with error messages if required fields are missing", () => {
  //   const user = {};
  //   const errors = validateUser(user);
  //
  //   const expectedErrors = [
  //     "First name is a required field.",
  //     "Last name is a required field.",
  //     "Email is a required field.",
  //     "Password is a required field.",
  //     "Date Of Birth is a required field.",
  //   ];
  //
  //   expect(errors).toEqual(expect.arrayContaining(expectedErrors));
  //   expect(errors).toHaveLength(expectedErrors.length);
  // });

  test("should return an error message if the name fields are null", () => {
    const user = {
      firstName: null,
      lastName: null,
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(2);
    expect(errors).toContainEqual("First name is a required field.");
    expect(errors).toContainEqual("Last name is a required field.");
  });

  test("should return an error message if the name fields are empty", () => {
    const user = {
      firstName: "",
      lastName: "",
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(2);
    expect(errors).toContainEqual("First name is a required field.");
    expect(errors).toContainEqual("Last name is a required field.");
  });

  test("should return error messages if the name fields contain invalid characters or extra spaces", () => {
    const invalidUsers = [
      {
        firstName: " Jane",
        lastName: "Smith",
      },
      {
        firstName: "Jane",
        lastName: "Smith ",
      },
      {
        firstName: "Jane!",
        lastName: "Doe",
      },
      {
        firstName: "Jane",
        lastName: "Doe@",
      },
    ];

    invalidUsers.forEach((nameData) => {
      const errors = validateUser({
        ...nameData,
        email: "janedoe@example.com",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      });

      // Expect one error per invalid field.
      if (
        nameData.firstName &&
        nameData.firstName.trim() !== nameData.firstName
      ) {
        expect(errors).toContainEqual(
          "First name can only contain letters, numbers, and a single space between words.",
        );
      }
      if (nameData.firstName && /[^a-zA-Z0-9\s]/.test(nameData.firstName)) {
        expect(errors).toContainEqual(
          "First name can only contain letters, numbers, and a single space between words.",
        );
      }
      if (nameData.lastName && nameData.lastName.trim() !== nameData.lastName) {
        expect(errors).toContainEqual(
          "Last name can only contain letters, numbers, and a single space between words.",
        );
      }
      if (nameData.lastName && /[^a-zA-Z0-9\s]/.test(nameData.lastName)) {
        expect(errors).toContainEqual(
          "Last name can only contain letters, numbers, and a single space between words.",
        );
      }
    });
  });

  test("should return error messages if the email is null", () => {
    const user = {
      firstName: "John",
      lastName: "Doe",
      email: null,
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toEqual(
      expect.arrayContaining(["Email is a required field."]),
    );
    expect(errors).toHaveLength(1);
  });

  test("should return error messages if the email is an empty string", () => {
    const user = {
      firstName: "John",
      lastName: "Doe",
      email: "",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toEqual(
      expect.arrayContaining(["Email is a required field."]),
    );
    expect(errors).toHaveLength(1);
  });

  test("should return an error message if the email is not in a valid format", () => {
    const invalidEmails = [
      { email: " janedoe@example.com" },
      { email: "janedoe@example.com " },
      { email: "janedoeexample.com" },
      { email: "janedoe@example" },
      { email: "jane!*@example.com" },
    ];

    invalidEmails.forEach((userData) => {
      const errors = validateUser({
        ...userData,
        firstName: "Jane",
        lastName: "Doe",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      });
      expect(errors).toHaveLength(1);
      expect(errors).toContainEqual("Email is not in a valid format.");
    });
  });

  test("should return error messages if the password is invalid or missing", () => {
    const invalidPasswords = [
      {
        user: { password: null },
        expectedErrors: ["Password is a required field."],
      },
      {
        user: { password: "" },
        expectedErrors: ["Password is a required field."],
      },
      {
        user: { password: "A12345!" },
        expectedErrors: ["Password must be at least 8 characters long."],
      },
    ];

    invalidPasswords.forEach(({ user, expectedErrors }) => {
      const errors = validateUser({
        ...user,
        firstName: "Jane",
        lastName: "Doe",
        email: "janedoe@example.com",
        dateOfBirth: "1990-02-01",
      });

      expect(errors).toEqual(expect.arrayContaining(expectedErrors));
      expect(errors).toHaveLength(expectedErrors.length);
    });
  });

  test("should return an error message if the password lacks an uppercase letter", () => {
    const user = {
      firstName: "Jane",
      lastName: "Doe",
      email: "janedoe@example.com",
      password: "12345678!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(1);
    expect(errors).toContainEqual(
      "Password must contain at least one uppercase letter.",
    );
  });

  test("should return an error message if the password lacks a special character", () => {
    const user = {
      firstName: "Jane",
      lastName: "Doe",
      email: "janedoe@example.com",
      password: "A12345678",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(1);
    expect(errors).toContainEqual(
      "Password must contain at least one special character.",
    );
  });

  test("should return error messages if the dateOfBirth is null or empty", () => {
    const invalidBirthdates = [{ dateOfBirth: null }, { dateOfBirth: "" }];

    invalidBirthdates.forEach((data) => {
      const errors = validateUser({
        firstName: "Jane",
        lastName: "Doe",
        email: "janedoe@example.com",
        password: "Password123!",
        ...data,
      });

      expect(errors).toEqual(
        expect.arrayContaining(["Date Of Birth is a required field."]),
      );
    });
  });
});
