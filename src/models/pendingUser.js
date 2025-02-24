const mongoose = require("mongoose");
logInfo = require("../utils/logInfo");
logError = require("../utils/logError");

// Connecting to the MongoDB databaseconst
MONGO_URI =
  "mongodb+srv://ldr-donna-vino:KUrvVGQV74ZojVoK@cluster0.y1wzc.mongodb.net/";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logInfo("Connected to MongoDB"))
  .catch((error) => logError("MongoDB Connection Error:", error));

// Defining the schema for the pending user
const pendingUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationToken: { type: String, required: true },
  verificationTokenExpires: { type: Date, required: true },
});

// Hashing the password
pendingUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Creating the model for the pending user
const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

// Exporting the model
module.exports = PendingUser;
