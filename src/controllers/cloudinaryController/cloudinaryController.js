import cloudinary from "../../config/cloudinary.js";
import { logError } from "../../util/logging.js";

export const cloudinaryController = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res
      .status(400)
      .json({ success: false, msg: "No file received by controller" });
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

        // ✅ Return Cloudinary result (URL, etc.)
        return res.status(200).json({
          success: true,
          msg: "File uploaded!",
          cloudinaryUrl: result.secure_url, // <-- most useful field
          result, // optionally send the full object
        });
      },
    );

    uploadStream.end(file.buffer);
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
