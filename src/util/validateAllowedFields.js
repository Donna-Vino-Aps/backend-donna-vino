/**
 * This function will return a string describing the error if the given object has properties not in the allowed list.
 * If there is no error, it will return an empty string.
 *
 * object - The object to check
 * allowedFields - An array of strings denoting the properties that are allowed
 */
const validateAllowedFields = (object, allowedFields) => {
  const invalidFields = Object.keys(object).filter(
    (key) => !allowedFields.includes(key),
  );

  if (invalidFields.length > 0) {
    return `The following properties are not allowed to be set: ${invalidFields.join(
      ", ",
    )}`;
  }
  return "";
};

export default validateAllowedFields;
