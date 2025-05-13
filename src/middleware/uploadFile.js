import multer from "multer";

// Set up storage in memory
const storage = multer.memoryStorage();

// Configure multer with file size limit (5MB)
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single("file"); // Expecting a single file with field name "file"

// Middleware to handle file upload
export const uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ success: false, msg: "File too large (max 5MB)" });
      }
      return res.status(400).json({ success: false, msg: err.message });
    } else if (err) {
      return res
        .status(500)
        .json({ success: false, msg: "File upload failed" });
    }

    // Check if a file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }

    next(); // Proceed to next middleware/controller
  });
};

export default uploadFile;
