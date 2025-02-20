import { vi } from "vitest";

// Mock `fs`
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock `bcrypt`
vi.mock("bcrypt", async () => {
  const actual = await vi.importActual("bcrypt"); // Import real module for unmocked functions
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue("hashed-string"),
    compare: vi.fn().mockResolvedValue(true),
  };
});

// Mock `emailConfig.js`
const mockTransporter = {
  sendMail: vi.fn().mockResolvedValue({ messageId: "test123" }),
};

vi.mock("../../../config/emailConfig.js", () => ({
  default: {
    createTransporter: vi.fn(() => mockTransporter),
  },
}));

// Mock `userVerification.js`
vi.mock("../../../models/userVerification.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(),
    find: vi.fn(),
    insertMany: vi.fn(),
  })),
}));
