import dotenv from "dotenv";
import { vi } from "vitest";

dotenv.config({ path: ".env.test" });

// Mock the logging utility for all tests
vi.mock("./src/util/logging.js", () => ({
  logInfo: vi.fn(),
  logWarning: vi.fn(),
  logError: vi.fn(),
}));
