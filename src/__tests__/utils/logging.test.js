import { describe, it, expect, vi } from "vitest";

let consoleLogMock, consoleWarnMock, consoleErrorMock;

beforeAll(() => {
  consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
});

import { logInfo, logWarning, logError } from "../../util/logging.js";

describe("logging", () => {
  afterEach(() => {
    consoleLogMock.mockClear();
    consoleWarnMock.mockClear();
    consoleErrorMock.mockClear();
  });

  it("logInfo should be called", () => {
    logInfo("Some message");
    expect(logInfo).toHaveBeenCalledTimes(1);
  });

  it("logInfo should support multiple arguments", () => {
    const user = { id: 123, name: "John Doe" };
    logInfo("User logged in:", user);
    expect(logInfo).toHaveBeenCalledWith("User logged in:", user);
  });

  it("logInfo should support object and primitive arguments", () => {
    logInfo("Request processed in", 250, "ms", { status: "success" });
    expect(logInfo).toHaveBeenCalledWith("Request processed in", 250, "ms", {
      status: "success",
    });
  });

  it("logWarning should be called", () => {
    logWarning("Some message");
    expect(logWarning).toHaveBeenCalledTimes(1);
  });

  it("logWarning should support multiple arguments", () => {
    const limit = { current: 95, max: 100 };
    logWarning("API rate limit approaching:", limit);
    expect(logWarning).toHaveBeenCalledWith(
      "API rate limit approaching:",
      limit,
    );
  });

  it("logWarning should support mixed argument types", () => {
    logWarning("Database connection slow", 1500, "ms", { action: "retry" });
    expect(logWarning).toHaveBeenCalledWith(
      "Database connection slow",
      1500,
      "ms",
      { action: "retry" },
    );
  });

  it("logError should be called", () => {
    logError("Some message");
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("logError should support Error objects", () => {
    const err = new Error("My error");
    logError(err);
    expect(logError).toHaveBeenCalledWith(err);
  });

  it("logError should support multiple arguments", () => {
    const additionalInfo = { code: 500, details: "Server error" };
    logError("Connection failed", additionalInfo);
    expect(logError).toHaveBeenCalledWith("Connection failed", additionalInfo);
  });

  it("logError should support multiple arguments with Error objects", () => {
    const err = new Error("Database error");
    const additionalInfo = { table: "users", operation: "insert" };
    logError(err, additionalInfo);
    expect(logError).toHaveBeenCalledWith(err, additionalInfo);
  });
});
