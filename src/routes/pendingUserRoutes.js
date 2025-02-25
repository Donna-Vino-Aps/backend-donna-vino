import express from "express";
import {
  createPendingUser,
  verifyPendingUser,
  resendVerificationEmail,
} from "../controllers/pendingUserController/pendingUserController.js";

const router = express.Router();

// Route for creating a pending user
router.post("/creatependinguser", createPendingUser);

// Route for verifying a pending user
router.post("/verifypending", verifyPendingUser);

// Route for resending the verification email
router.post("/resend-verification", resendVerificationEmail);

export default router;
