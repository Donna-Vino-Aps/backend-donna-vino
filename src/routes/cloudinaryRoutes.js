import express from "express";
import { cloudinaryController } from "../controllers/cloudinaryController/cloudinaryController.js";
import { uploadFile } from "../middleware/uploadFile.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const cloudinaryRouter = express.Router();

cloudinaryRouter.post(
  "/profile-logo",
  authMiddleware,
  uploadFile,
  cloudinaryController,
);

export default cloudinaryRouter;
