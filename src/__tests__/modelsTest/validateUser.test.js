import { validateUser } from "../../models/userModels";

describe("validateUser function", () => {
  test("should return an empty array if all required fields are provided", () => {
    const user = {
      name: "Jane Doe",
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "2024-02-04",
    };

    const errors = validateUser(user);
    expect(errors).toHaveLength(0);
  });

  // test("should return an array with error messages if required fields are missing", () => {
  //   const user = {};
  //   const errors = validateUser(user);

  //   const expectedErrors = [
  //     "Name is a required field.",
  //     "Email is a required field",
  //     "Email is not in a valid format",
  //     "Password is a required field",
  //     "Password must be at least 8 characters long",
  //     "Password must contain at least one uppercase letter",
  //     "Password must contain at least one special character.",
  //     "Date Of Birth is a required field.",
  //     "Date Of Birth is a required field with valid format (e.g., 'Tue Feb 01 2022').",
  //   ];

  //   expect(errors).toEqual(expect.arrayContaining(expectedErrors));
  //   expect(errors).toHaveLength(expectedErrors.length);
  // });

  test("should return an error message if the name is null", () => {
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

  test("should return an error message if the name is an empty field", () => {
    const user = {
      name: "",
      email: "janedoe@example.com",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(1);
    expect(errors).toContainEqual("Name is a required field.");
  });

  test("should return error messages if the name contains invalid characters or spaces", () => {
    const invalidNames = [
      {
        name: " Jane Smith",
        email: "janedoe@example.com",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "Jane Smith ",
        email: "janedoe@example.com",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "Jane!",
        email: "janedoe@example.com",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      },
      {
        name: "Jane@",
        email: "janedoe@example.com",
        password: "Password123!",
        dateOfBirth: "1990-02-01",
      },
    ];

    invalidNames.forEach((user) => {
      const errors = validateUser(user);
      expect(errors).toHaveLength(1);
      expect(errors).toContainEqual(
        "Name can only contain letters, numbers, and a single space between words.",
      );
    });
  });

  test("should return error messages if the email is null", () => {
    const user = {
      name: "John Doe",
      email: null,
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Email is a required field",
        "Email is not in a valid format",
      ]),
    );
    expect(errors).toHaveLength(2);
  });

  test("should return error messages if the email is an empty string", () => {
    const user = {
      name: "John Doe",
      email: "",
      password: "Password123!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Email is a required field",
        "Email is not in a valid format",
      ]),
    );
    expect(errors).toHaveLength(2);
  });

  test("should return an error message if the email is not in a valid format", () => {
    const invalidEmails = [
      { email: " janedoe@example.com" },
      { email: "janedoe@example.com " },
      { email: "janedoeexample.com" },
      { email: "janedoe@example" },
      { email: "jane!*@example.com" },
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

  test("should return error messages if the password is invalid or missing", () => {
    const invalidPasswords = [
      {
        user: { password: null },
        expectedErrors: [
          "Password is a required field",
          "Password must be at least 8 characters long",
          "Password must contain at least one uppercase letter",
          "Password must contain at least one special character.",
        ],
      },
      {
        user: { password: "" },
        expectedErrors: [
          "Password is a required field",
          "Password must be at least 8 characters long",
          "Password must contain at least one uppercase letter",
          "Password must contain at least one special character.",
        ],
      },
      {
        user: { password: "A12345!" },
        expectedErrors: ["Password must be at least 8 characters long"],
      },
    ];

    invalidPasswords.forEach(({ user, expectedErrors }) => {
      const errors = validateUser({
        ...user,
        name: "Jane Doe",
        email: "janedoe@example.com",
        dateOfBirth: "1990-02-01",
      });

      expect(errors).toEqual(expect.arrayContaining(expectedErrors));
      expect(errors).toHaveLength(expectedErrors.length);
    });
  });

  test("should return an error message if the password lacks an uppercase letter", () => {
    const user = {
      name: "Jane Doe",
      email: "janedoe@example.com",
      password: "12345678!",
      dateOfBirth: "1990-02-01",
    };
    const errors = validateUser(user);

    expect(errors).toHaveLength(1);
    expect(errors).toContainEqual(
      "Password must contain at least one uppercase letter",
    );
  });

  test("should return an error message if the password lacks a special character", () => {
    const user = {
      name: "Jane Doe",
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

    invalidBirthdates.forEach((user) => {
      const errors = validateUser({
        ...user,
        name: "Jane Doe",
        email: "janedoe@example.com",
        password: "Password123!",
      });
      expect(errors).toEqual(
        expect.arrayContaining([
          "Date Of Birth is a required field.",
          "Date Of Birth is a required field with valid format (YYYY-MM-DD, e.g., '2024-02-04').",
        ]),
      );
    });
  });
});
