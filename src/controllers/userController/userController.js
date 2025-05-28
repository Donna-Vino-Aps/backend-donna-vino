import User from "../../models/userModels.js";
import { logError } from "../../util/logging.js";
import { validateUser } from "../../models/users/userModels.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, result: users });
  } catch (error) {
    logError(error);
    res
      .status(500)
      .json({ success: false, msg: "Unable to get users, try again later" });
  }
};

export const getUserProfile = async (req, res) => {
  const userIdFromToken = req.accessToken.userId;
  const { id: userIdFromParam } = req.params;

  if (userIdFromToken.toString() !== userIdFromParam) {
    return res.status(403).json({
      success: false,
      msg: "You are not authorized to view this profile.",
    });
  }

  try {
    const user = await User.findById(userIdFromParam);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Send the necessary user details as a response
    res.status(200).json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        country: user.country,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const userIdFromToken = req.accessToken.userId;
  const { id: userIdFromParam } = req.params;

  if (userIdFromToken.toString() !== userIdFromParam) {
    return res.status(403).json({
      success: false,
      msg: "You are not authorized to update this profile.",
    });
  }

  try {
    const { firstName, lastName, address, country } = req.body;

    if (req.body.email) {
      return res.status(400).json({
        success: false,
        msg: "Email updates are not allowed via this endpoint.",
      });
    }

    const userToValidate = { ...req.body };
    const errorList = validateUser(userToValidate, true);

    if (errorList.length > 0) {
      logError(`Validation errors: ${JSON.stringify(errorList)}`);
      return res.status(400).json({
        success: false,
        msg: validationErrorMessage(errorList),
      });
    }

    if (
      firstName === undefined &&
      lastName === undefined &&
      address === undefined &&
      country === undefined
    ) {
      return res.status(400).json({
        success: false,
        msg: "No valid fields provided for update.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userIdFromParam,
      {
        firstName,
        lastName,
        address,
        country,
      },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    res.status(200).json({ success: true, result: updatedUser });
  } catch (error) {
    logError(error);
    res
      .status(500)
      .json({ success: false, msg: "Unable to update user profile" });
  }
};
