import fs from "fs";
import bcrypt from "bcrypt";
import { createTransporter } from "../../../config/emailConfig.js";
import UserVerification from "../../../models/userVerification.js";
import { logError, logInfo } from "../../../util/logging.js";

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-string"),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: "test123" }),
};

jest.mock("../../../config/emailConfig.js", () => ({
  createTransporter: jest.fn(() => mockTransporter),
}));

jest.mock("../../../models/userVerification.js", () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(),
    find: jest.fn(),
    insertMany: jest.fn(),
  }));
});
