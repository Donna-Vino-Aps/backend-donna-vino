/**
 * UserPre discriminator — temporary pre-registration users.
 *
 * These users:
 * - Use the same schema as the base `User`
 * - Automatically expire 1 day after creation
 * - Are used for users pending email verification or registration completion
 */

import mongoose from "mongoose";
import User from "./userModels.js"; // base model
import ms from "ms";

const userPreSchema = new mongoose.Schema({
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + ms("1d")), // 1 day from now
    required: true,
  },
});

// TTL index to auto-delete unverified users after 1 day
userPreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * UserPre model — stored in the same 'users' collection as User,
 * distinguished by discriminator key (e.g., kind: 'UserPre')
 */
const UserPre = User.discriminator("UserPre", userPreSchema);

export default UserPre;
