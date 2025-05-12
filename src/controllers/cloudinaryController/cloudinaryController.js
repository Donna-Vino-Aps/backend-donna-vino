import cloudinary from "../../config/cloudinary.js";
import { logError } from "../../util/logging.js";

export const cloudinaryController = async (req, res) => {
  const file = req.file; // multer saves the file in req.file

  if (!file) {
    return res.status(400).json({ success: false, msg: "No file provided" });
  }

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "user_profiles",
      },
      (error, result) => {
        if (error) {
          return res.status(500).json({
            success: false,
            msg: "Image upload failed",
            error: error.message,
          });
        }

        res.status(200).json({
          success: true,
          msg: "Image uploaded successfully",
          url: result.secure_url,
        });
      },
    );

    // Stream the buffer to Cloudinary
    uploadStream.end(file.buffer);
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      msg: "Unexpected server error during upload",
      error: error.message,
    });
  }
};

export default cloudinaryController;
