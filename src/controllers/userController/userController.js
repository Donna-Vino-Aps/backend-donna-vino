import User from "../../models/users/userModels.js";
import { logError } from "../../util/logging.js";

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
  try {
    // Assuming you are storing the user's ID in the JWT token and using it to fetch the user
    const user = await User.findById(req.user.id); // req.user.id comes from the 'protect' middleware (decoded JWT token)

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Send the necessary user details as a response
    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      address: user.address,
      country: user.country,
      // Add any other necessary fields here
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, password, address, country } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        password,
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
