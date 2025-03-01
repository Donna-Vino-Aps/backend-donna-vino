import { vi } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  hash: vi.fn().mockResolvedValue("hashed-string"),
  compare: vi.fn().mockResolvedValue(true),
}));

const mockTransporter = {
  sendMail: vi.fn().mockResolvedValue({ messageId: "test123" }),
};

vi.mock("../../config/emailConfig.js", () => ({
  createTransporter: vi.fn(() => mockTransporter),
}));

vi.mock("../.../models/userVerification.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(),
    find: vi.fn(),
    insertMany: vi.fn(),
  })),
}));
