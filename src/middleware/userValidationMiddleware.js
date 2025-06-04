import mongoose from "mongoose";

export const userValidationMiddleware = (req, res, next) => {
  const { id } = req.params;
  const { firstName, lastName, address, country } = req.body;

  // Validate that id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format.",
    });
  }

  const errors = [];

  // input validation
  if (firstName !== undefined && typeof firstName !== "string") {
    errors.push("firstName must be a string.");
  }

  if (lastName !== undefined && typeof lastName !== "string") {
    errors.push("lastName must be a string.");
  }

  if (address !== undefined && typeof address !== "string") {
    errors.push("address must be a string.");
  }

  if (country !== undefined && typeof country !== "string") {
    errors.push("country must be a string.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body.",
      errors,
    });
  }

  // If all validations pass, proceed to the next middleware
  next();
};
