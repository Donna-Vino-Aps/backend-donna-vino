import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/userModels.js";
import User from "../../models/userModels.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";

export const signup = async (req, res) => {
  // Updated allowed fields based on the new user model
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "dateOfBirth",
    "authProvider",
  ];

  if (!(req.body.user instanceof Object)) {
    return res.status(400).json({
      success: false,
      msg: `Invalid request: You need to provide a valid 'user' object. Received: ${JSON.stringify(
        req.body.user,
      )}`,
    });
  }

  if (req.body.user && req.body.user.email) {
    req.body.user.email = req.body.user.email.toLowerCase();
  }

  const invalidFieldsError = validateAllowedFields(
    req.body.user,
    allowedFields,
  );
  if (invalidFieldsError) {
    return res
      .status(400)
      .json({ success: false, msg: `Invalid request: ${invalidFieldsError}` });
  }

  // Call validateUser with just the user object
  const errorList = validateUser(req.body.user);
  if (errorList.length > 0) {
    return res
      .status(400)
      .json({ success: false, msg: validationErrorMessage(errorList) });
  }

  try {
    const { email } = req.body.user;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }

    const newUser = await User.create(req.body.user);



    logInfo(`User created successfully: ${newUser.email}`);

    // Prepare a response without sensitive data
    const userResponse = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      authProvider: newUser.authProvider,
      isVip: newUser.isVip,
    };

    return res.status(201).json({
      success: true,
      msg: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    logError("Error in signup process: " + error.message);
    return res
      .status(500)
      .json({ success: false, msg: "Unable to create user, try again later" });
  }
};
