import cloudinary from "../../config/cloudinary.js";
import { logError, logInfo } from "../../util/logging.js";
import User from "../../models/userModels.js";

export const cloudinaryController = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res
      .status(400)
      .json({ success: false, msg: "No file received by controller" });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "user_profiles" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    logInfo("Access Token on req:", req.accessToken);

    await User.findByIdAndUpdate(req.accessToken.userId, {
      picture: result.secure_url,
    });

    return res.status(200).json({
      success: true,
      msg: "File uploaded!",
      cloudinaryUrl: result.secure_url,
      result,
    });
  } catch (error) {
    logError(error);
    return res.status(500).json({
      success: false,
      msg: "Unexpected server error during upload",
      error: error.message,
    });
  }
};

export default cloudinaryController;
