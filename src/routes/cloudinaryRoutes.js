import express from "express";
import { cloudinaryController } from "../controllers/cloudinaryController/cloudinaryController.js";
import uploadFile from "../middleware/uploadFile.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// Create a router for cloudinary-related routes
const cloudinaryRouter = express.Router();

cloudinaryRouter.post(
  "/profile-logo",
  authMiddleware,
  uploadFile,
  cloudinaryController,
);

export default cloudinaryRouter;
