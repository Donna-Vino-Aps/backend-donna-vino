import User from "../models/userModels.js";
import { logError } from "../util/logging.js";

/**
 * Middleware for validating user profile updates
 * - Filters allowed fields
 * - Validates data using Mongoose schema
 * - Prevents unauthorized field updates
 */
export const userValidationMiddleware = async (req, res, next) => {
  // Extract only allowed fields from request body
  const { firstName, lastName, address, country } = req.body;

  // Create an update object with only permitted fields
  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (address !== undefined) updateData.address = address;
  if (country !== undefined) updateData.country = country;

  // Block email updates through this endpoint
  if (req.body.email) {
    return res.status(400).json({
      success: false,
      msg: "Email updates are not allowed via this endpoint.",
    });
  }

  // If no valid fields are provided, return early
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      msg: "No valid fields provided for update.",
    });
  }

  try {
    // Create a temporary user document for validation
    // Include dummy values for required fields to pass schema validation
    const dummyUser = {
      email: "validation@example.com", // Dummy required field
      firstName: firstName || "Validation", // Use provided value or dummy
      lastName: lastName || "User",
      ...updateData, // Override with fields being updated
    };

    const userToValidate = new User(dummyUser);

    // Validate only the fields we are updating
    const fieldsToValidate = Object.keys(updateData);
    const validationError = userToValidate.validateSync(fieldsToValidate);

    if (validationError) {
      const errorMessages = Object.values(validationError.errors).map(
        (err) => err.message,
      );
      logError(`User validation errors: ${JSON.stringify(errorMessages)}`);

      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: errorMessages,
      });
    }

    // Attach the validated data to the request for the controller to use
    req.validatedUpdateData = updateData;
    next();
  } catch (error) {
    logError(`Unexpected validation error: ${error}`);
    return res.status(500).json({
      success: false,
      msg: "An error occurred during validation",
    });
  }
};
