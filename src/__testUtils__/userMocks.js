import User, { validateUser } from "../models/userModels";

export const addUserToMockDB = async (newUser) => {
  const validationResult = validateUser(newUser);

  if (validationResult.length > 0) {
    throw new Error(
      `Invalid user attempting to be added to the Database. User attempted to be added: ${JSON.stringify(
        newUser,
      )}. Received errors: ${validationResult.join(", ")}.`,
    );
  }

  const user = new User(newUser);

  await user.save();
};

export const findUserInMockDB = async (email) => {
  if (typeof email !== "string") {
    throw new Error(
      `Invalid userId given! Should be a string, but received: ${email}`,
    );
  }

  const user = await User.findOne({ email });

  const passwordHash = user ? user.password : null;

  return { user, passwordHash };
};
