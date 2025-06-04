import User from "../../models/userModels.js";
import { logError } from "../../util/logging.js";

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
      return res.status(404).json({ success: false, msg: "User not found" });
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
    logError("Error fetching user profile:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const userIdFromToken = req.accessToken.user;
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

    // const userToValidate = { ...req.body };

    // New validateUser-function can be used here

    // const errorList = validateUser(userToValidate, true);

    // if (errorList.length > 0) {
    //   logError(`Validation errors: ${JSON.stringify(errorList)}`);
    //   return res.status(400).json({
    //     success: false,
    //     msg: validationErrorMessage(errorList),
    //   });
    // }

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
    res.status(200).json({
      success: true,
      result: {
        result: {
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          address: updatedUser.address,
          country: updatedUser.country,
        },
      },
      msg: "User profile updated successfully",
    });
  } catch (error) {
    logError(error);
    res
      .status(500)
      .json({ success: false, msg: "Unable to update user profile" });
  }
};

export const deleteUser = async (req, res) => {
  const userIdFromToken = req.accessToken.user;
  const { id: userIdFromParam } = req.params;

  if (userIdFromToken.toString() !== userIdFromParam) {
    return res.status(403).json({
      success: false,
      msg: "You are not authorized to delete this profile.",
    });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({ success: true, msg: "User deleted successfully" });
  } catch (error) {
    logError("Error deleting user:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
