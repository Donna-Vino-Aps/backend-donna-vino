export const validatePendingUserData = (userData) => {
  if (
    !userData.email ||
    !userData.password ||
    !userData.firstName ||
    !userData.lastName ||
    !userData.birthdate
  ) {
    throw new Error("Missing required fields.");
  }
};
