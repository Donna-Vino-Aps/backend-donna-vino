const commonPasswords = [
  "password123",
  "123456",
  "123456789",
  "qwerty",
  "abc123",
  "password",
  "12345",
];

export const validatePassword = (password) => {
  const lengthCheck = password.length >= 8;
  const complexityCheck =
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const commonPasswordCheck = commonPasswords.includes(password.toLowerCase());

  return {
    isValid: lengthCheck && complexityCheck && !commonPasswordCheck,
    errors: [
      !lengthCheck && "Password must be at least 8 characters long.",
      !complexityCheck &&
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      commonPasswordCheck &&
        "Password is too common. Please choose a different one.",
    ].filter(Boolean),
  };
};
