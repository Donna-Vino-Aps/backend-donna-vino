import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/users/userModels.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";

export const preSignUp = async (req, res) => {
  const pendingUserAllowedFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
    "isSubscribed",
  ];

  if (!req.body.user || typeof req.body.user !== "object") {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: You need to provide a valid 'user' object. Received: ${JSON.stringify(
        req.body.user,
      )}`,
    });
  }

  // Normalize email if provided
  if (req.body.user.email && typeof req.body.user.email === "string") {
    req.body.user.email = req.body.user.email.toLowerCase();
  }

  // Validate the allowed fields
  const invalidFieldsError = validateAllowedFields(
    req.body.user,
    pendingUserAllowedFields,
  );
  if (invalidFieldsError) {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: ${invalidFieldsError}`,
    });
  }

  // Validate the user data
  const userToValidate = { ...req.body.user };
  const errorList = validateUser(userToValidate);
  if (errorList.length > 0) {
    return res.status(400).json({
      success: false,
      msg: validationErrorMessage(errorList),
    });
  }

  return res.status(201).json({
    success: true,
    msg: "Verification email sent. Please check your inbox to complete the signup process.",
    pendingUser: {
      email: pendingUser.email,
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
    },
  });
};
