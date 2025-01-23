// import { logError, logInfo } from "../../util/logging.js";
import validationErrorMessage from "../../util/validationErrorMessage.js";
import { validateUser } from "../../models/userModels.js";
import User from "../../models/userModels.js";
import validateAllowedFields from "../../util/validateAllowedFields.js";
import { sendVerificationEmail } from "./emailVerificationController.js";

export const signup = async (req, res) => {
  const allowedFields = ["name", "email", "password", "dateOfBirth"];

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

  const errorList = validateUser(req.body.user, true);
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

    // Send the verification email
    try {
      await sendVerificationEmail(newUser);
      // logInfo(`Verification email sent for user: ${newUser.email}`);
    } catch (error) {
      // logError("Error sending verification email: " + error.message);
    }

    // logInfo(`User created successfully: ${newUser.email}`);
    return res.status(201).json({
      success: true,
      msg: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    // logError("Error in signup process: " + error.message);
    return res
      .status(500)
      .json({ success: false, msg: "Unable to create user, try again later" });
  }
};
