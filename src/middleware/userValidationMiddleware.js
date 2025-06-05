import mongoose from "mongoose";
import User from "../models/User.js";

export const userValidationMiddleware = async (req, res, next) => {
  const { id } = req.params;

  // Validate that id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format.",
    });
  }

  try {
    // Create a dummy User instance with only the updated fields
    const updates = req.body;
    const tempUser = new User(updates);

    // Validate only the provided fields
    await tempUser.validate(); // Full validation (optional: restrict to only provided fields)

    // Attach the clean, validated data to the request
    req.validatedUpdateData = updates;

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: err.errors
        ? Object.values(err.errors).map((e) => e.message)
        : [err.message],
    });
  }
};
