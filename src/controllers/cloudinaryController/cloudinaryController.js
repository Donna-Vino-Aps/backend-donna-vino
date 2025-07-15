import cloudinary from "../../config/cloudinary.js";
import { logError, logInfo } from "../../util/logging.js";
import User from "../../models/userModels.js";
import { AccessToken } from "../../models/index.js";

export const cloudinaryController = async (req, res) => {
  const file = req.file;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];

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

    const decodedToken = await AccessToken.fromJWT(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.decodedToken = decodedToken;

    const updateResult = await User.findByIdAndUpdate(decodedToken.user, {
      picture: result.secure_url,
      new: true,
    });

    if (process.env.NODE_ENV === "development") {
      logInfo("Updated user document:", updateResult);
    }

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
