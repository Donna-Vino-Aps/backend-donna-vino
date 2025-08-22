import cloudinary from "../../config/cloudinary.js";
import { logError } from "../../util/logging.js";
import User from "../../models/userModels.js";

export const cloudinaryController = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, msg: "No file received" });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "user_profiles" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    const userId = req.user;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, msg: "User not authenticated" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: result.secure_url },
      { new: true },
    );

    res.status(200).json({
      success: true,
      msg: "File uploaded and user updated!",
      url: updatedUser.avatar,
      result,
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      msg: "Error uploading image or updating user",
      error: error.message,
    });
  }
};

export default cloudinaryController;
