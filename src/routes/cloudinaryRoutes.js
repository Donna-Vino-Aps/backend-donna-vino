import express from "express";
import { cloudinaryController } from "../controllers/cloudinaryController/cloudinaryController.js";
import { uploadFile } from "../middleware/uploadFile.js";
const cloudinaryRouter = express.Router();

cloudinaryRouter.post("/profile-logo", uploadFile, cloudinaryController);

export default cloudinaryRouter;
