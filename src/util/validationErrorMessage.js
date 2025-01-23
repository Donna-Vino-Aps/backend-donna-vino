/**
 * In our models, we will have validation checkers that should return an array of error messages.
 * This function creates a user-friendly message for the API user, indicating what is wrong.
 *
 * @param {string[]} errorList - An array of error messages describing what went wrong.
 * @returns {string} A user-friendly error message.
 */
const validationErrorMessage = (errorList) => {
  if (!Array.isArray(errorList)) {
    throw new TypeError("Expected an array of strings for errorList");
  }

  return `BAD REQUEST: ${errorList.join(", ")}`;
};

export default validationErrorMessage;
