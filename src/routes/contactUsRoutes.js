import express from "express";
import { contactUsController } from "../controllers/contactUsController/contactUsController.js";

const contactUsRouter = express.Router();

contactUsRouter.post("/", contactUsController);

export default contactUsRouter;
